import streamlit as st
from PIL import Image, ImageDraw
import numpy as np
import io
import base64

# Fonction pour convertir une image en base64 (fond)
def get_base64_image(path):
    with open(path, "rb") as f:
        data = f.read()
    return base64.b64encode(data).decode()

# Chargement CSS local (boutons, sliders, etc.)
def local_css(file_name):
    with open(file_name) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

local_css("style.css")

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
        @media (max-width: 768px) {{
            .block-container {{
                padding: 1rem;
                margin: 1rem;
            }}
            h1 {{
                font-size: 1.8rem;
            }}
            .sidebar .css-1v0mbdj {{
                font-size: 1rem;
            }}
            section[data-testid="stSidebar"] {{
                display: none;
            }}
            .sidebar-toggle {{
                display: block;
                position: fixed;
                top: 1rem;
                left: 1rem;
                background-color: rgba(255,255,255,0.7);
                border: none;
                border-radius: 0.5rem;
                padding: 0.5rem 1rem;
                font-size: 1rem;
                z-index: 9999;
                cursor: pointer;
            }}
        }}
        h1 {{
            text-align: center;
            margin-bottom: 1rem;
        }}
    </style>
    <script>
        document.addEventListener('click', function(e) {{
            const sidebar = document.querySelector('section[data-testid="stSidebar"]');
            const toggleBtn = document.querySelector('.sidebar-toggle');
            if (sidebar && toggleBtn && window.innerWidth <= 768) {{
                const clickedInside = sidebar.contains(e.target) || toggleBtn.contains(e.target);
                if (!clickedInside) {{
                    sidebar.style.display = 'none';
                    toggleBtn.style.display = 'block';
                }}
            }}
        }});
        const sidebar = document.querySelector('section[data-testid="stSidebar"]');
        if (sidebar) {{
            sidebar.style.transition = 'all 0.3s ease';
        }}
    </script>
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

    buf = io.BytesIO()
    output.save(buf, format="PNG")
    buf.seek(0)
    return buf

# -------------------- MULTILINGUE --------------------
TEXT = {
    "fr": {
        "title": "PixelArt à colorier",
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
        "title": "Colorable PixelArt",
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

# Bouton de toggle de la sidebar sur mobile
st.markdown("""
    <script>
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = '☰';
    toggleBtn.onclick = function() {
        const sidebar = document.querySelector('section[data-testid="stSidebar"]');
        if (sidebar) {
            sidebar.style.display = 'block';
            sidebar.style.opacity = 0;
            sidebar.style.transform = 'translateX(-10px)';
            setTimeout(() => {
                sidebar.style.opacity = 1;
                sidebar.style.transform = 'translateX(0)';
            }, 10);
        }
        this.style.display = 'none';
    };
    document.body.appendChild(toggleBtn);
    </script>
""", unsafe_allow_html=True)

# Sélecteur de langue avec affichage
lang = st.sidebar.selectbox(
    "🌐 Language / Langue",
    ["fr", "en"],
    format_func=lambda x: "🇫🇷 Français" if x == "fr" else "🇬🇧 English"
)

# Titre
title = TEXT[lang]["title"]
st.markdown(f"<h1>{title}</h1>", unsafe_allow_html=True)

# Texte d'intro
st.markdown(f"""
<p style='font-size: 1.2rem; text-align: center; max-width: 700px; margin: auto;'>
    {TEXT[lang]['intro']}
</p>
""", unsafe_allow_html=True)

# Interface principale
st.subheader(TEXT[lang]["step1"])
uploaded_file = st.file_uploader("Image (JPG ou PNG)", type=["jpg", "jpeg", "png"])

st.subheader(TEXT[lang]["step2"])
grid_size = st.slider(TEXT[lang]["grid_slider"], 5, 50, 20)
point_radius = st.slider(
    TEXT[lang]["point_slider"],
    min_value=0.0, max_value=1.0, value=0.12, step=0.01, format="%.2f"
)

if uploaded_file:
    st.subheader(TEXT[lang]["step3"])
    image = Image.open(uploaded_file)
    st.image(image, caption=TEXT[lang]["step3"], use_container_width=True)

    st.subheader(TEXT[lang]["step4"])
    buf = generate_pixel_art(image, grid_size=grid_size, point_radius=point_radius)
    st.image(buf, caption=TEXT[lang]["step4"], use_container_width=True)
    st.download_button(TEXT[lang]["download"], buf, file_name="grille_coloriage.png", mime="image/png")
