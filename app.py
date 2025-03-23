import streamlit as st
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
import io

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
st.title("Pixel Art à colorier")

uploaded_file = st.file_uploader("Choisis une image", type=["jpg", "jpeg", "png"])

grid_size = st.slider("Taille de la grille (nombre de cases)", 5, 50, 20)
point_radius = st.slider("Taille des points", 0.05, 0.3, 0.12)

if uploaded_file:
    image = Image.open(uploaded_file)
    st.image(image, caption="Image d'origine", use_column_width=True)

    buf = generate_pixel_art(image, grid_size=grid_size, point_radius=point_radius)
    st.image(buf, caption="Grille à colorier", use_column_width=True)
    st.download_button("Télécharger l'image", buf, file_name="grille_coloriage.png", mime="image/png")
