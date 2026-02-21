"""
PDF generation for accreditation reports (READ-ONLY).
"""
from io import BytesIO
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer


class ReportPDFService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            name="ReportTitle",
            parent=self.styles["Heading1"],
            fontSize=16,
            leading=20,
            spaceAfter=8,
        )
        self.subtitle_style = ParagraphStyle(
            name="ReportSubtitle",
            parent=self.styles["Normal"],
            fontSize=10,
            textColor=colors.grey,
            spaceAfter=12,
        )

    def _build_table(self, headers: List[str], rows: List[List[str]]) -> Table:
        table_data = [headers] + rows
        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        return table

    def build_report_pdf(
        self,
        title: str,
        subtitle: Optional[str],
        headers: List[str],
        rows: List[List[str]],
        landscape_mode: bool = True,
    ) -> bytes:
        buffer = BytesIO()
        pagesize = landscape(A4) if landscape_mode else A4
        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            leftMargin=24,
            rightMargin=24,
            topMargin=24,
            bottomMargin=24,
        )

        elements = [Paragraph(title, self.title_style)]
        if subtitle:
            elements.append(Paragraph(subtitle, self.subtitle_style))

        if not rows:
            elements.append(Paragraph("No data available for this report.", self.styles["Normal"]))
        else:
            elements.append(self._build_table(headers, rows))

        doc.build(elements)
        return buffer.getvalue()

