import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('android/app/src/main/res/mipmap-nodpi',{recursive:true});
await copyFile('public/icons/icon-512.png','android/app/src/main/res/mipmap-nodpi/ic_launcher.png');
console.log('Ícone Android preparado.');
