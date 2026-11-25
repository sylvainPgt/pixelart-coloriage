import streamlit as st
import numpy as np
from PIL import Image, ImageDraw
import io
import base64
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent / "coloring_grid_component"))
from coloring_grid_component.coloring_grid import coloring_grid

# --- Initialisation du Session State ---
DEFAULT_GRID_SIZE = 20
DEFAULT_COLOR_RGB = (255, 255, 255) # Blanc
DEFAULT_COLOR_HEX = "#ffffff"

# 1. Initialise le guide si nécessaire
if "guide_grid_rgb" not in st.session_state:
    if "last_image" in st.session_state:
        try:
            img = st.session_state["last_image"].convert("RGB")
            guide_grid = np.array(img)
            st.session_state["guide_grid_rgb"] = guide_grid
            # Utilise la taille de l'image chargée si disponible
            st.session_state["grid_size"] = guide_grid.shape[0]
        except Exception as e:
            st.error(f"Erreur lors du chargement de l'image précédente: {e}")
            # Fallback vers défaut si l'image est invalide
            st.session_state["grid_size"] = DEFAULT_GRID_SIZE
            st.session_state["guide_grid_rgb"] = np.full((DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE, 3), DEFAULT_COLOR_RGB, dtype=np.uint8)
    else:
        # Pas d'image de la page 1, utilise les valeurs par défaut
        st.session_state["grid_size"] = DEFAULT_GRID_SIZE
        st.session_state["guide_grid_rgb"] = np.full((DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE, 3), DEFAULT_COLOR_RGB, dtype=np.uint8)

# 2. Initialise la grille de coloriage actuelle si nécessaire
if "current_coloring_rgb" not in st.session_state:
    # Commence avec une grille blanche de la bonne taille
    current_size = st.session_state["grid_size"]
    st.session_state["current_coloring_rgb"] = np.full((current_size, current_size, 3), DEFAULT_COLOR_RGB, dtype=np.uint8)

# 3. Initialise couleur et outil si nécessaire
if "selected_color" not in st.session_state:
    st.session_state["selected_color"] = DEFAULT_COLOR_HEX
if "selected_tool" not in st.session_state:
    st.session_state["selected_tool"] = "PEN" # Ou "ERASER"

# Récupère la taille pour le reste du script
grid_size = st.session_state["grid_size"]

st.set_page_config(page_title="Créer un coloriage pixel art", page_icon="🖼️", layout="wide")

# Fond d'écran
bg_path = "assets/background.png"
with open(bg_path, "rb") as f:
    bg_base64 = base64.b64encode(f.read()).decode()

st.markdown(f"""
    <style>
    .stApp {{
        background-image: url("data:image/png;base64,{bg_base64}");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }}
    .block-container {{
        background: rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 1rem;
        padding: 2rem;
        max-width: 900px;
        margin: 2rem auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }}
    section[data-testid="stSidebar"] {{
        background: rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 1rem;
        margin: 1rem;
        padding: 1rem;
    }}
    </style>
""", unsafe_allow_html=True)

st.markdown("""
<h1 style='text-align: center;'>🎨 Coloriage en ligne</h1>
<p style='text-align: center;'>Clique sur une case pour la colorier avec la couleur sélectionnée.</p>
""", unsafe_allow_html=True)

# Palette de couleurs
palette = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"]

if "selected_color" not in st.session_state:
    st.session_state["selected_color"] = palette[0]

st.markdown("### 🖌️ Palette & Outils") # Titre mis à jour

# Palette de couleurs
palette = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"] # Garde tes couleurs
cols_palette = st.columns(len(palette))
for i, color in enumerate(palette):
    # Indique si la couleur est sélectionnée ET que l'outil est le crayon
    is_selected_pen = (st.session_state["selected_tool"] == "PEN" and st.session_state["selected_color"] == color)
    border = "3px solid black" if is_selected_pen else "1px solid #ccc"

    # Utilise on_click pour mettre à jour couleur ET outil
    if cols_palette[i].button(" ", key=f"color_{i}", type="secondary"): # type="secondary" peut améliorer le style
         st.session_state["selected_color"] = color
         st.session_state["selected_tool"] = "PEN"
         st.rerun() # Force le re-run pour màj visuelle immédiate du bouton/outil

    # Affichage du carré de couleur (légèrement ajusté pour être cliquable)
    cols_palette[i].markdown(
         f"""<div style='margin-top: -40px; margin-bottom: 10px; width:30px; height:30px; background-color:{color}; border:{border}; border-radius:5px; cursor: pointer;'></div>""",
         unsafe_allow_html=True
    )

# Bouton Gomme
st.markdown("---") # Séparateur
is_eraser_selected = (st.session_state["selected_tool"] == "ERASER")
if st.button("Gomme 🧽", type="primary" if is_eraser_selected else "secondary"):
    st.session_state["selected_tool"] = "ERASER"
    st.rerun() # Force le re-run pour màj visuelle

# Affichage de l'outil/couleur sélectionné
st.markdown("### ✅ Outil Sélectionné :")
if st.session_state["selected_tool"] == "PEN":
    color_choice = st.session_state["selected_color"]
    st.markdown(f"""
    Couleur : <div style='display: inline-block; width:30px; height:30px; background-color:{color_choice}; border:2px solid #000; border-radius:6px; vertical-align: middle;'></div>
    """, unsafe_allow_html=True)
else: # ERASER
    st.markdown("Gomme 🧽 (Clique pour restaurer la couleur cible)")

st.markdown("---") # Séparateur

col1, col2 = st.columns([1, 1])
if col1.button("🧼 Réinitialiser le coloriage"):
    # Réinitialise current_coloring_rgb à une grille blanche
    current_size = st.session_state["grid_size"]
    st.session_state["current_coloring_rgb"] = np.full((current_size, current_size, 3), DEFAULT_COLOR_RGB, dtype=np.uint8)
    st.rerun()

if col2.button("💾 Télécharger mon coloriage"):
    # Utilise current_coloring_rgb pour créer l'image
    img = Image.fromarray(st.session_state["current_coloring_rgb"].astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    st.download_button("📥 Télécharger l'image coloriée", data=buf.getvalue(), file_name="coloriage_termine.png", mime="image/png")

# Appel du composant React avec les données du coloriage ACTUEL
color_grid_hex = [
    ["#{:02x}{:02x}{:02x}".format(*tuple(rgb)) for rgb in row]
    for row in st.session_state["current_coloring_rgb"] # Utilise current_coloring_rgb
]

click = coloring_grid(grid_size=grid_size, color_grid=color_grid_hex, key="grille_interactive")

if click:
    try:
        i, j = map(int, click.split("-"))

        if st.session_state["selected_tool"] == "PEN":
            # Applique la couleur sélectionnée
            hex_color = st.session_state["selected_color"]
            # Fonction helper pour convertir HEX en RGB (à définir ou importer)
            # def hex_to_rgb(hex_code):
            #     h = hex_code.lstrip('#')
            #     return tuple(int(h[k:k+2], 16) for k in (0, 2, 4))
            # Assure-toi d'avoir cette fonction quelque part
            rgb = tuple(int(hex_color.lstrip("#")[k:k+2], 16) for k in (0, 2, 4)) # Conversion HEX -> RGB
            st.session_state["current_coloring_rgb"][i, j] = rgb
        elif st.session_state["selected_tool"] == "ERASER":
            # Récupère la couleur du guide et l'applique
            guide_rgb = st.session_state["guide_grid_rgb"][i, j]
            st.session_state["current_coloring_rgb"][i, j] = guide_rgb

        st.rerun() # Met à jour l'affichage

    except Exception as e:
        st.warning(f"Erreur de clic : {e}")
        print(f"Erreur de clic : {e}, valeur reçue : {click}") # Ajout d'un print pour déboguer si besoin
