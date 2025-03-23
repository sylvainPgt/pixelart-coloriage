import streamlit as st
import numpy as np
from PIL import Image

from PIL import ImageDraw
import base64

st.set_page_config(page_title="Coloriage en ligne", layout="wide")
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

st.title("🎨 Coloriage en ligne")

# Choix du mode
type_mode = st.radio("Mode de départ :", ["🆕 Grille vierge", "🖼️ Depuis un modèle"])

if type_mode == "🆕 Grille vierge":
    grid_size = st.slider("Taille de la grille", 5, 50, 20)
    st.session_state["color_grid"] = np.full((grid_size, grid_size, 3), 255, dtype=np.uint8)
    palette = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"]
else:
    if "last_image" not in st.session_state or not isinstance(st.session_state["last_image"], Image.Image):
        st.warning("Aucun modèle disponible. Va d'abord créer une image.")
        st.stop()
    img = st.session_state["last_image"].convert("RGB")
    grid_size = img.size[0]
    img_np = np.array(img)
    st.session_state["color_grid"] = img_np.copy()
    unique_colors = np.unique(img_np.reshape(-1, img_np.shape[2]), axis=0)
    palette = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in unique_colors]

color_choice = st.selectbox("Couleur", palette)

st.markdown("---")

col1, col2 = st.columns([1, 1])
if col1.button("🧼 Effacer tout"):
    st.session_state["color_grid"][:] = 255

from PIL import Image as PILImage
import io
if col2.button("💾 Télécharger mon coloriage"):
    img = PILImage.fromarray(st.session_state["color_grid"].astype(np.uint8))
    buf = io.BytesIO()
    st.session_state["last_image"] = img  # Enregistre l'image dans la session
    img.save(buf, format="PNG")
    st.download_button("📥 Télécharger l'image coloriée", data=buf.getvalue(), file_name="coloriage_termine.png", mime="image/png")

for i in range(grid_size):
    cols = st.columns(grid_size)
    for j in range(grid_size):
        rgb = st.session_state["color_grid"][i, j]
        hex_color = '#%02x%02x%02x' % tuple(rgb)
        if cols[j].button(" ", key=f"btn_{i}_{j}", use_container_width=True):
            rgb_new = tuple(int(color_choice.lstrip("#")[k:k+2], 16) for k in (0, 2, 4))
            st.session_state["color_grid"][i, j] = rgb_new
        cols[j].markdown(
            f"<div style='height:20px; width:100%; background-color:{hex_color}; border:1px solid #aaa;'></div>",
            unsafe_allow_html=True
        )
