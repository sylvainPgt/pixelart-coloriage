import streamlit as st
st.set_page_config(page_title="Créer un coloriage pixel art", page_icon="🖼️", layout="centered")

from PIL import Image, ImageDraw
import numpy as np
import io
import base64

# Fonction pour convertir une image en base64 (fond)
def get_base64_image(path):
    with open(path, "rb") as f:
        data = f.read()
    return base64.b64encode(data).decode()

# Injecte l'image de fond pixel art en base64
bg_base64 = get_base64_image("assets/background.png")

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
            padding: 2rem 2rem 4rem 2rem;
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

# Fonction de génération du pixel art (sans matplotlib)
def generate_pixel_art(image: Image.Image, grid_size=20, point_radius=0.12):
    img = image.convert("RGB").resize((grid_size, grid_size), Image.NEAREST)
    img_np = np.array(img)

    cell_size = 40
    output_size = grid_size * cell_size
    output = Image.new("RGB", (output_size, output_size), (255, 255, 255))
    draw = ImageDraw.Draw(output)

    for i in range(grid_size):
        for j in range(grid_size):
            color = tuple(img_np[i, j])
            cx = j * cell_size + cell_size // 2
            cy = i * cell_size + cell_size // 2
            radius = int(point_radius * cell_size)
            draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color)
            draw.rectangle((j * cell_size, i * cell_size, (j + 1) * cell_size, (i + 1) * cell_size), outline="gray")

    # Sauvegarde l'image et la taille de grille dans session_state
    st.session_state["last_image"] = img
    st.session_state["grid_size"] = grid_size

    buf = io.BytesIO()
    output.save(buf, format="PNG")
    buf.seek(0)
    return buf

# Texte multilingue
TEXT = {
    "fr": {
        "title": "Créer un coloriage pixel art",
        "intro": "📸 Uploade une image de ton choix (photo, dessin, logo…)<br>🧩 L'application va la transformer en grille de <strong>Pixel Art</strong><br>🎨 Tu pourras ensuite imprimer cette grille et la colorier, case par case !",
        "step1": "1️⃣ Choisis une image",
        "step2": "2️⃣ Paramètres de la grille",
        "step3": "3️⃣ Image d'origine",
        "step4": "4️⃣ Résultat à colorier",
        "grid_slider": "Taille de la grille (ex: 10 = 10x10 cases)",
        "point_slider": "Taille des points (0 = invisible, 1 = remplit une case)",
        "download": "📥 Télécharger l'image"
    },
    "en": {
        "title": "Create a PixelArt coloring page",
        "intro": "📸 Upload an image (photo, drawing, logo…)<br>🧩 We'll turn it into a <strong>Pixel Art</strong> grid<br>🎨 You can print and color it, square by square!",
        "step1": "1️⃣ Choose an image",
        "step2": "2️⃣ Grid settings",
        "step3": "3️⃣ Original image",
        "step4": "4️⃣ PixelArt to color",
        "grid_slider": "Grid size (e.g. 10 = 10x10 cells)",
        "point_slider": "Dot size (0 = invisible, 1 = fills a cell)",
        "download": "📥 Download image"
    }
}

# Sélecteur de langue
lang = st.sidebar.selectbox(
    "🌐 Language / Langue",
    ["fr", "en"],
    format_func=lambda x: "🇫🇷 Français" if x == "fr" else "🇬🇧 English"
)

# Titre
title = TEXT[lang]["title"]
st.markdown(f"<h1>{title}</h1>", unsafe_allow_html=True)

# Intro
st.markdown(f"""
<p style='font-size: 1.2rem; text-align: center; max-width: 700px; margin: auto;'>
    {TEXT[lang]['intro']}
</p>
""", unsafe_allow_html=True)

# Interface principale
uploaded_file = st.file_uploader("Image (JPG ou PNG)", type=["jpg", "jpeg", "png"])

st.subheader(TEXT[lang]["step2"])
grid_size = st.slider(TEXT[lang]["grid_slider"], 5, 50, 20)
point_radius = st.slider(TEXT[lang]["point_slider"], 0.0, 1.0, 0.12, 0.01, format="%.2f")

if uploaded_file:
    st.subheader(TEXT[lang]["step3"])
    image = Image.open(uploaded_file)
    st.image(image, caption=TEXT[lang]["step3"], use_container_width=True)

    st.subheader(TEXT[lang]["step4"])
    buf = generate_pixel_art(image, grid_size=grid_size, point_radius=point_radius)
    st.image(buf, caption=TEXT[lang]["step4"], use_container_width=True)
    st.download_button(TEXT[lang]["download"], buf, file_name="grille_coloriage.png", mime="image/png")
