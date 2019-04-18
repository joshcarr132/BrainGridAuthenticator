const Cortex = require('./cortex.js');
/*
Emotiv Command Authentication
 */

const verbose = 2;
const dev = true;
const options = { verbose, threshold: 0, dev };

// helper function to parse result from JSON and convert to object
const columns2obj = headers => (cols) => {
  const obj = {};
  for (let i = 0; i < cols.length; i++) {
    obj[headers[i]] = cols[i];
  }
  return obj;
};

function commandBlock(client, blockId = 1, blockTime = 8000, threshold = 30) {
  return new Promise((resolve, reject) => {
    const blockData = {
      // output: '',
      blockId,
      commands: {}, // a log to store all command data from the block
    };
    /* Commands are stored in the following stucture
         blockData= {
           output: string--the command determined as the output for the entire block
           blockId: integer,
           commands: {
            command1: [eventCount, totalPower],
            command2: [eventCount, totalPower],
            ...
           }

         }
     */

    client
      .createSession({ _auth: client._auth, status: 'open' })
      .then(() => client.subscribe({ streams: ['com'] })) // subscribe to commands stream
      .then((subs) => {
        if (!subs[0].com) {
          reject(new Error('failed to subscribe'));
        } // in case of failure

        const com2obj = columns2obj(subs[0].com.cols); // convert json to obj

        const onCom = (ev) => {
          const data = com2obj(ev.com);
          client._log(data);
          if (!blockData.commands.hasOwnProperty(data.act)) {
            // check if command already stored
            // if (!Object.hasOwnProperty(blockData.commands, data.act)) {
            blockData.commands[data.act] = [1, data.pow]; // if not, add it
          } else {
            blockData.commands[data.act][0] += 1; // otherwise increment power by 1 and
            blockData.commands[data.act][1] += data.pow; // total power by current command's power
          }
          console.log(blockData);
          if (blockData.commands[data.act][1] > threshold) {
            // end block if a command exceeds threshold value
            blockData.output = [
              blockData.commands[data.act][0],
              blockData.commands[data.act][1],
            ];
            resolve(blockData);
          }
        };

        client.on('com', onCom);

        setTimeout(() => {
          // once command block initialized, start timer which will end the block
          client._log('Command block ended');

          // determine command by total (cumulative) power
          let highestPower = [];

          Object.keys(blockData.commands).forEach((command) => {
            const power = blockData.commands[command][1];
            if (!highestPower[0]) {
              highestPower = [command, power];
            } else if (power > highestPower[1]) {
              highestPower = [command, power];
            }
          });

          client._log(
            `Command: ${highestPower[0]}  |  power: ${highestPower[1]}`,
          );
          blockData.output = [highestPower[0], highestPower[1]];
          // cleanup and close block
          client
            .unsubscribe({ streams: ['com'] })
            .then(() => client.updateSession({ status: 'close' }))
            .then(() => {
              client.removeListener('com', onCom);
            });
          // client._log(blockData);
          resolve(blockData);
        }, blockTime);
      })
      .catch(err => client._warn(err));
  });
}

function loadTrainingProfile(client) {
  // TODO: check of any profiles already loaded, allow to continue with existing profile or logout and select new
  // TODO: more robust error handling
  return new Promise((resolve, reject) => {
    client
      .call('queryProfile', { _auth: client._auth }) // retrieve and display names of all profiles
      .then((profiles) => {
        console.log('Training Profiles');
        if (profiles.length === 0) {
          reject(new Error('no profiles found'));
        }
        for (let i = 0; i < profiles.length; i++) {
          console.log(`${i}: ${profiles[i].name}`);
        }
      })

      .then(() => 'josh test')

      .then((profileName) => {
        // load profile
        client
          .call('queryHeadsets') // get headset id
          .then((res) => {
            if (!res[0]) {
              throw new Error(
                'Headset not detected. Is it on and connected to Cortex?',
              );
            }
            return res[0].id; // return the id of the headset
          })
          .then((headsetId) => {
            // load the selected profile
            client
              .call('setupProfile', {
                _auth: client._auth,
                headset: headsetId,
                profile: profileName,
                status: 'load',
              })
              .then(() => resolve());
          });
      });
  });
}

function initClient(auth) {
  return new Promise((resolve) => {
    const client = new Cortex(options);
    client.ready.then(() => {
      client
        .init({
          username: auth.username,
          password: auth.password,
          client_id: auth.client_id,
          client_secret: auth.client_secret,
          debit: auth.debit,
        })
        .then((result) => {
          console.log(`init result${result}`);
          resolve(client);
        });
    });
  });
}

module.exports = { commandBlock, initClient, loadTrainingProfile };
