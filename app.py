import streamlit as st
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
import io
import base64

def get_base64_logo(path):
    with open(path, "rb") as f:
        data = f.read()
    return base64.b64encode(data).decode()

def local_css(file_name):
    with open(file_name) as f:
        css = f"<style>{f.read()}</style>"
        st.markdown(css, unsafe_allow_html=True)

local_css("style.css")

st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(to bottom right, #fceabb, #f8b500);
            background-attachment: fixed;
        }
    </style>
""", unsafe_allow_html=True)


def generate_pixel_art(image: Image.Image, grid_size=20, point_radius=0.12):
    # Redimensionnement
    img = image.convert("RGB").resize((grid_size, grid_size), Image.NEAREST)
    img_np = np.array(img)

    # Création de la figure
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.set_xticks(np.arange(0, grid_size, 1))
    ax.set_yticks(np.arange(0, grid_size, 1))
    ax.set_xticklabels([])
    ax.set_yticklabels([])
    ax.grid(color="gray", linestyle="-", linewidth=1)
    ax.set_xlim(0, grid_size)
    ax.set_ylim(0, grid_size)

    for i in range(grid_size):
        for j in range(grid_size):
            color = img_np[i, j] / 255
            ax.add_patch(plt.Circle((j + 0.5, grid_size - 1 - i + 0.5), point_radius, color=color))

    plt.gca().invert_yaxis()
    plt.tight_layout()

    # Export en buffer
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=300)
    buf.seek(0)
    plt.close()

    return buf

# Interface Streamlit
# Logo + Titre centrés
logo_base64 = get_base64_logo("assets/logo.png")

st.markdown(f"""
    <div style='text-align: center;'>
        <img src="data:image/png;base64,{logo_base64}" width="80"/>
        <h1>PixelArt à colorier</h1>
    </div>
""", unsafe_allow_html=True)




uploaded_file = st.file_uploader("Choisis une image", type=["jpg", "jpeg", "png"])

grid_size = st.slider("Taille de la grille (nombre de cases)", 5, 50, 10)
point_radius = st.slider(
    "Taille des points (0 = invisible, 1 = toute la case)",
    min_value=0.0,
    max_value=1.0,
    value=0.12,
    step=0.01,
    format="%.2f"
)


if uploaded_file:
    image = Image.open(uploaded_file)
    st.image(image, caption="Image d'origine", use_container_width=True)
    

    buf = generate_pixel_art(image, grid_size=grid_size, point_radius=point_radius)
    st.image(buf, caption="Grille à colorier", use_container_width=True)
    st.download_button("Télécharger l'image", buf, file_name="grille_coloriage.png", mime="image/png")
