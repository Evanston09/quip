"""Export Quip's launcher assets from the original Quippy vector artwork.
Requires cairosvg and Pillow. No AI-generated replacement character.
"""
from copy import deepcopy
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/brand"
OUT.mkdir(exist_ok=True)
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
source = ET.parse(ROOT / "assets/mascot/koala.svg").getroot()
head = deepcopy(source.find(f".//{{{NS}}}g[@id='head']"))
for element in head.iter():
    if "stroke" in element.attrib:
        element.set("fill", "none")
    if "d" in element.attrib:
        element.set("d", " ".join(re.findall(r"[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?", element.get("d"))))
head.set("transform", "translate(512 675) scale(1.95)")
BUBBLE = "M300 196H724C811 196 866 251 866 338V638C866 725 811 780 724 780H478L359 858V780H300C213 780 158 725 158 638V338C158 251 213 196 300 196Z"

def svg(name, background=None, scale=1, mono=False):
    root = ET.Element(f"{{{NS}}}svg", {"width": "1024", "height": "1024", "viewBox": "0 0 1024 1024", "fill": "none"})
    ET.SubElement(root, f"{{{NS}}}title").text = "Quip — Quippy the koala"
    if background:
        ET.SubElement(root, f"{{{NS}}}rect", {"width": "1024", "height": "1024", "fill": background})
    group = ET.SubElement(root, f"{{{NS}}}g", {"transform": f"translate(512 512) scale({scale}) translate(-512 -512)"})
    if not mono:
        ET.SubElement(group, f"{{{NS}}}path", {"d": BUBBLE, "fill": "#F0F7F1"})
    portrait = deepcopy(head)
    if mono:
        # Single-tone silhouette with facial features cut out, for themed launchers.
        for element in portrait.iter():
            if "fill" in element.attrib:
                element.set("fill", "#FFFFFF")
            if "stroke" in element.attrib:
                element.set("stroke", "#000000")
            element.attrib.pop("opacity", None)
        for feature in ["nose", "eye-left", "eye-right"]:
            item = portrait.find(f".//{{{NS}}}g[@id='{feature}']")
            for element in item.iter():
                if "fill" in element.attrib:
                    element.set("fill", "#000000")
                if "stroke" in element.attrib:
                    element.set("stroke", "#000000")
        for ear in ["ear-left", "ear-right"]:
            portrait.find(f".//{{{NS}}}g[@id='{ear}']")[1].set("fill", "#000000")
        portrait.find(f".//{{{NS}}}g[@id='cheeks']").clear()
    group.append(portrait)
    path = OUT / f"{name}.svg"
    ET.ElementTree(root).write(path, encoding="unicode")
    return path

def render(path, name, size=1024, opaque=False):
    png = cairosvg.svg2png(url=str(path), output_width=size, output_height=size)
    image = Image.open(BytesIO(png)).convert("RGB" if opaque else "RGBA")
    image.save(OUT / name)

icon = svg("quip-icon", background="#347553")
foreground = svg("quip-adaptive-foreground", scale=0.72)
monochrome = svg("quip-monochrome-source", background="#000000", scale=0.82, mono=True)
render(icon, "quip-icon.png", opaque=True)
render(foreground, "quip-adaptive-foreground.png")
render(foreground, "quip-splash.png", size=512)
render(icon, "quip-favicon.png", size=64, opaque=True)
# Transfer the black/white silhouette into alpha; RGB is one solid tone.
mask = Image.open(BytesIO(cairosvg.svg2png(url=str(monochrome)))).convert("L")
image = Image.new("RGBA", mask.size, (0, 0, 0, 0))
image.putalpha(mask)
image.save(OUT / "quip-adaptive-monochrome.png")
print("Exported Quip icon, adaptive foreground, themed icon, splash mark, and favicon.")
