# Voicemeeter Utils

Some utils for Voicemeeter built with ElectronJS.

This project is also using cpp scripts from [Raraph84/Windows-Tools](https://github.com/Raraph84/Windows-Tools)

## Features

- Sync Windows volume/mute to a Voicemeeter strip volume/mute.
- Automatically reload Voicemeeter when a device is plugged in.
- Play a sound and change the tray icon when microphone is toggled.
- Create TCP server for toggle the microphone. (for bind a script that call the server to a key in Razer Synapse)
- Automatically disable VBAN outgoing streams if no sound is played. (for save data if you are using VBAN over a private VPN over mobile data)

## Roadmap

- Add ability to enable start on boot in the tray menu.
- Find a better icon.

## Build (with cmd)

Download [Git](https://git-scm.com/downloads) and [NodeJS](https://nodejs.org/en/download)  
Clone the repo :
```
git clone https://github.com/Raraph84/Voicemeeter-Utils
```
Copy the `config.example.js` to `config.js` and fill it  
Install libs and build :
```
cd Voicemeeter-Utils
npm install
npm run package
```
The built exe file is in `Voicemeeter-Utils/out`

## Contributions

Contributions are welcome! If you would like to contribute, please create a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any questions or assistance, feel free to reach out to me on Discord: [@raraph84](https://discord.com/users/486801186419245060).
