const { Jimp } = require('jimp');
const path = require('path');

const imagesToConvert = [
  'assets/images/icon.png',
  'assets/images/splash-icon.png',
  'assets/images/favicon.png'
];

async function convertImages() {
  console.log('🔄 Début de la conversion des images en vrai format PNG...');

  for (const relativePath of imagesToConvert) {
    const fullPath = path.join(__dirname, '..', relativePath);
    try {
      console.log(`Reading ${relativePath}...`);
      const image = await Jimp.read(fullPath);
      
      console.log(`Writing ${relativePath} as true PNG...`);
      await image.write(fullPath);
      console.log(`✅ ${relativePath} converti avec succès !`);
    } catch (error) {
      console.error(`❌ Erreur lors de la conversion de ${relativePath} :`, error);
    }
  }

  console.log('🎉 Terminé ! Toutes les images sont désormais au format PNG.');
}

convertImages();
