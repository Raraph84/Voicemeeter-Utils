# Voicemeeter Utils

Ce repo contient des utilitaires pour Voicemeeter
Actuellement, ils permettent :
- De synchroniser le volume et l'état muet de Windows avec une entrée (configurée dans le fichier config.json) de Voicemeeter
- De recharger Voicemeeter lorsqu'un périphérique est branché

# Installation
Prérequis : Avoir installé [NodeJS](https://nodejs.org/fr)  
Ouvrir un terminal (cmd/powershell) dans le projet puis exécuter :
```
npm install
npm run make
```
Une fois fait, il vous faudra créer un raccourci (Clic droit -> Nouveau -> Raccourci) dans le dossier `C:\Users\[Utilisateur]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup` pour lancer le projet au démarrage de Windows.  
Ce dernier doit pointer vers `[Chemin du projet]\out\voicemeeter-utils-win32-x64\voicemeeter-utils.exe`.
