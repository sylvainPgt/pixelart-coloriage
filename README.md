# 🎨 Mosaipix — Pixel Art Studio

Mosaipix est une application Next.js responsive dédiée au pixel art. Elle permet de partir d'un modèle, d'une image locale ou d'une description textuelle, puis de colorier, personnaliser et exporter le résultat directement dans le navigateur.

## Développement moderne

```bash
npm install
npm run dev
```

Ouvrez ensuite `http://localhost:3000`.

## Déployer sur Vercel

1. Importez le dépôt depuis le tableau de bord Vercel.
2. Vercel détecte automatiquement Next.js et exécute `npm run build`.
3. Cliquez sur **Deploy** : aucune variable d'environnement n'est requise.

Le fichier `vercel.json` documente explicitement la commande de build. L'ancien prototype Streamlit reste présent temporairement pour référence.

Une application web simple et ludique pour transformer vos images en pixel art à colorier — idéale pour les enfants, les parents, les profs ou les fans de DIY !

![demo](assets/assets_demo.png)


---

## 🚀 Fonctionnalités

- 🖼️ Upload de n'importe quelle image (JPEG/PNG)
- 📏 Réglage de la taille de la grille (ex : 10x10 à 50x50)
- 🎯 Ajustement de la taille des points
- 💾 Aperçu instantané et téléchargement du résultat

---

## ▶️ Lancer l'application en local

# 1. Cloner le dépôt
git clone https://github.com/sylvainPgt/pixelart-coloriage.git
cd pixelart-coloriage

# 2. Créer un environnement virtuel
python -m venv venv
.\venv\Scripts\activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Lancer l'app
streamlit run app.py

## 📦 Dépendances

- [streamlit](https://streamlit.io/)
- [matplotlib](https://matplotlib.org/)
- [numpy](https://numpy.org/)
- [Pillow (PIL)](https://python-pillow.org/)

---

## 🌐 Déploiement (à venir)

- [ ] Démo publique via Hugging Face Spaces ou Streamlit Cloud
- [ ] Packs de modèles pixel art préfaits
- [ ] Export PDF haute résolution
- [ ] Version mobile ou app tablette ?

---

## 🤝 Contribuer

Les idées, suggestions ou pull requests sont les bienvenus !  
Tu peux aussi ouvrir une issue pour proposer une nouvelle fonctionnalité.

---

## 📄 Licence

MIT — Libre de l'utiliser, le modifier, le partager 🙌
