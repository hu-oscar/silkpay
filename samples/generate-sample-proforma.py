"""Generate a realistic proforma invoice PDF for the Phase 3 demo.

Run with:
    python3 samples/generate-sample-proforma.py

Produces `samples/proforma-yiwu-30k.pdf` (gitignored).
The doc matches the Chinedu↔Mr. Chen seed scenario: Yiwu Smart Devices Co. Ltd
selling 200 X12 Pro smartphones to Chinedu Trading Ltd, FOB Yiwu, $30,000 USD.
"""
from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# Brand-ish palette so it doesn't look AI-generated boilerplate.
NAVY = colors.HexColor("#0B2545")
SLATE = colors.HexColor("#475569")
LIGHT = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#CBD5E1")
ACCENT = colors.HexColor("#0EA5E9")


def styles():
    s = getSampleStyleSheet()
    return {
        "supplier_name": ParagraphStyle(
            "supplier_name", parent=s["Normal"],
            fontName="Helvetica-Bold", fontSize=18, textColor=NAVY, leading=22,
        ),
        "supplier_meta": ParagraphStyle(
            "supplier_meta", parent=s["Normal"],
            fontName="Helvetica", fontSize=8.5, textColor=SLATE, leading=12,
        ),
        "doc_title": ParagraphStyle(
            "doc_title", parent=s["Normal"],
            fontName="Helvetica-Bold", fontSize=22, textColor=NAVY, alignment=2,
            leading=24,
        ),
        "doc_meta": ParagraphStyle(
            "doc_meta", parent=s["Normal"],
            fontName="Helvetica", fontSize=9, textColor=SLATE, alignment=2,
            leading=12,
        ),
        "label": ParagraphStyle(
            "label", parent=s["Normal"],
            fontName="Helvetica-Bold", fontSize=8, textColor=SLATE,
            spaceBefore=0, spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "body", parent=s["Normal"],
            fontName="Helvetica", fontSize=9.5, textColor=NAVY, leading=13,
        ),
        "section": ParagraphStyle(
            "section", parent=s["Normal"],
            fontName="Helvetica-Bold", fontSize=10, textColor=NAVY,
            spaceBefore=4, spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "small", parent=s["Normal"],
            fontName="Helvetica", fontSize=8, textColor=SLATE, leading=11,
        ),
        "totals_label": ParagraphStyle(
            "totals_label", parent=s["Normal"],
            fontName="Helvetica", fontSize=9.5, textColor=SLATE, alignment=2,
        ),
        "totals_value": ParagraphStyle(
            "totals_value", parent=s["Normal"],
            fontName="Helvetica-Bold", fontSize=10, textColor=NAVY, alignment=2,
        ),
        "totals_grand": ParagraphStyle(
            "totals_grand", parent=s["Normal"],
            fontName="Helvetica-Bold", fontSize=13, textColor=NAVY, alignment=2,
        ),
    }


def header(st):
    """Top bar with supplier identity (left) and document title (right)."""
    left = [
        Paragraph("Yiwu Smart Devices Co., Ltd.", st["supplier_name"]),
        Paragraph("义乌智能设备有限公司", st["supplier_meta"]),
        Spacer(1, 4),
        Paragraph(
            "International Trade City, District 1<br/>"
            "Yiwu, Zhejiang 322000, China<br/>"
            "Tel: +86-579-8855-1234 · sales@yiwusmart.cn<br/>"
            "Business License: 913307825578291X02",
            st["supplier_meta"],
        ),
    ]
    right = [
        Paragraph("PROFORMA INVOICE", st["doc_title"]),
        Spacer(1, 6),
        Paragraph(
            "<b>No.</b> YSD-2026-0142<br/>"
            "<b>Issued:</b> 2026-04-20<br/>"
            "<b>Valid until:</b> 2026-05-04",
            st["doc_meta"],
        ),
    ]
    tbl = Table([[left, right]], colWidths=[10 * cm, 8 * cm])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (0, 0), (-1, 0), 2, ACCENT),
    ]))
    return tbl


def parties(st):
    """Two-column buyer/seller block."""
    seller = [
        Paragraph("SELLER", st["label"]),
        Paragraph("<b>Yiwu Smart Devices Co., Ltd.</b>", st["body"]),
        Paragraph(
            "International Trade City, District 1<br/>"
            "Yiwu, Zhejiang 322000<br/>"
            "China<br/>"
            "Wei Chen — Export Manager<br/>"
            "wei.chen@yiwusmart.cn",
            st["body"],
        ),
    ]
    buyer = [
        Paragraph("BUYER", st["label"]),
        Paragraph("<b>Chinedu Trading Ltd.</b>", st["body"]),
        Paragraph(
            "Computer Village, Ikeja<br/>"
            "Lagos 100271<br/>"
            "Nigeria<br/>"
            "Chinedu Okafor — Director<br/>"
            "chinedu@chinedutrading.ng",
            st["body"],
        ),
    ]
    tbl = Table(
        [[seller, buyer]],
        colWidths=[9 * cm, 9 * cm],
    )
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("LINEBETWEEN", (0, 0), (0, 0), 0.5, BORDER),
    ]))
    return tbl


def items_table(st):
    header_row = ["#", "Description", "HSC Code", "Qty", "Unit (USD)", "Total (USD)"]
    items = [
        (
            "1",
            "X12 Pro Smartphone — 6.7\" OLED, 256 GB, 5G dual-SIM, midnight black",
            "8517.12.00",
            "120",
            "150.00",
            "18,000.00",
        ),
        (
            "2",
            "X12 Pro Smartphone — 6.7\" OLED, 256 GB, 5G dual-SIM, ocean blue",
            "8517.12.00",
            "60",
            "150.00",
            "9,000.00",
        ),
        (
            "3",
            "X12 Pro Smartphone — 6.7\" OLED, 512 GB, 5G dual-SIM, midnight black",
            "8517.12.00",
            "20",
            "150.00",
            "3,000.00",
        ),
    ]

    rows = [header_row] + [list(r) for r in items]
    cell_styles = [
        # keep description as Paragraph so it wraps
        [
            r[0],
            Paragraph(r[1], st["body"]) if i > 0 else r[1],
            r[2],
            r[3],
            r[4],
            r[5],
        ]
        for i, r in enumerate(rows)
    ]

    tbl = Table(
        cell_styles,
        colWidths=[0.9 * cm, 8.6 * cm, 2.6 * cm, 1.4 * cm, 2.2 * cm, 2.3 * cm],
    )
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
        ("FONT", (0, 1), (-1, -1), "Helvetica", 9.5),
        ("ALIGN", (3, 1), (-1, -1), "RIGHT"),  # qty + prices right-aligned
        ("ALIGN", (0, 1), (0, -1), "CENTER"),  # row #
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("LINEBELOW", (0, 0), (-1, 0), 1.0, NAVY),
        ("INNERGRID", (0, 1), (-1, -1), 0.25, BORDER),
    ]))
    return tbl


def totals_block(st):
    rows = [
        [Paragraph("Subtotal", st["totals_label"]),
         Paragraph("USD 30,000.00", st["totals_value"])],
        [Paragraph("Packing & handling", st["totals_label"]),
         Paragraph("USD 0.00", st["totals_value"])],
        [Paragraph("Discount", st["totals_label"]),
         Paragraph("USD 0.00", st["totals_value"])],
        [Paragraph("<b>TOTAL (FOB Yiwu)</b>", st["totals_label"]),
         Paragraph("USD 30,000.00", st["totals_grand"])],
    ]
    tbl = Table(rows, colWidths=[5.0 * cm, 4.0 * cm], hAlign="RIGHT")
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, NAVY),
        ("BACKGROUND", (0, -1), (-1, -1), LIGHT),
    ]))
    return tbl


def terms_block(st):
    body = [
        Paragraph("PAYMENT TERMS", st["label"]),
        Paragraph(
            "30% T/T in advance (escrow), 50% upon BL signing, "
            "20% upon delivery confirmation. Settlement in USD via Yuán "
            "stablecoin escrow on BNB Chain.",
            st["small"],
        ),
        Spacer(1, 4),

        Paragraph("INCOTERMS 2020", st["label"]),
        Paragraph("FOB Yiwu, China.", st["small"]),
        Spacer(1, 4),

        Paragraph("DELIVERY", st["label"]),
        Paragraph(
            "Container loading at Yiwu within 14 days of funding confirmation. "
            "Sea freight to Apapa Port (Lagos) — ETA 28–35 days.",
            st["small"],
        ),
        Spacer(1, 4),

        Paragraph("BANK / SETTLEMENT", st["label"]),
        Paragraph(
            "USDT (BEP-20) escrow contract address provided post-funding. "
            "Off-ramp to ICBC business account in CNY upon milestone release.",
            st["small"],
        ),
    ]
    tbl = Table([[body]], colWidths=[18 * cm])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    return tbl


def footer_signature(st):
    rows = [
        [
            Paragraph(
                "<b>Authorized signature</b><br/><br/><br/>"
                "________________________<br/>"
                "Wei Chen, Export Manager<br/>"
                "Yiwu Smart Devices Co., Ltd.",
                st["small"],
            ),
            Paragraph(
                "<b>Stamp</b><br/><br/><br/><br/>"
                "<i>(Company seal applied on physical copy)</i>",
                st["small"],
            ),
        ]
    ]
    tbl = Table(rows, colWidths=[9 * cm, 9 * cm])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return tbl


def build():
    here = Path(__file__).resolve().parent
    out = here / "proforma-yiwu-30k.pdf"

    doc = SimpleDocTemplate(
        str(out),
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title="Proforma Invoice YSD-2026-0142",
        author="Yiwu Smart Devices Co., Ltd.",
    )
    st = styles()

    story = []
    story.append(header(st))
    story.append(Spacer(1, 8 * mm))
    story.append(parties(st))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("LINE ITEMS", st["section"]))
    story.append(items_table(st))
    story.append(Spacer(1, 4 * mm))
    story.append(totals_block(st))
    story.append(Spacer(1, 6 * mm))
    story.append(terms_block(st))
    story.append(Spacer(1, 8 * mm))
    story.append(footer_signature(st))

    doc.build(story)
    size_kb = out.stat().st_size / 1024
    print(f"OK -> {out}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    build()
