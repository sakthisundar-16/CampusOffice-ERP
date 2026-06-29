import qrcode
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime

class PDFService:
    @staticmethod
    def generate_fee_receipt(payment_data: dict, output_path: str):
        qr_data = f"REC-{payment_data.get('id', 'N/A')}|{payment_data.get('transaction_id', 'N/A')}|{payment_data.get('student_name', 'N/A')}"
        qr = qrcode.make(qr_data)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)

        doc = SimpleDocTemplate(output_path, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a2e'),
            spaceAfter=30,
            alignment=1
        )

        story.append(Paragraph("CampusOffice ERP", title_style))
        story.append(Paragraph("Fee Receipt", title_style))
        story.append(Spacer(1, 0.2*inch))

        data = [
            ["Receipt Number:", f"REC-{payment_data.get('id', 'N/A')}"],
            ["Date:", datetime.now().strftime("%Y-%m-%d %H:%M")],
            ["Student Name:", payment_data.get('student_name', 'N/A')],
            ["Register Number:", payment_data.get('roll_number', 'N/A')],
            ["Department:", payment_data.get('department', 'N/A')],
            ["Fee Type:", payment_data.get('fee_name', 'N/A')],
            ["Amount Paid:", f"Rs. {payment_data.get('amount_paid', 0):.2f}"],
            ["Transaction ID:", payment_data.get('transaction_id', 'N/A')],
            ["Payment Date:", payment_data.get('payment_date', datetime.now().strftime("%Y-%m-%d"))],
            ["Verified By:", payment_data.get('verified_by', 'Office Staff')],
            ["Status:", "PAID"],
        ]

        table = Table(data, colWidths=[2.5*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Scan QR Code for Verification:", styles['Normal']))
        story.append(Image(qr_buffer, width=1.5*inch, height=1.5*inch))
        doc.build(story)
        return output_path

    @staticmethod
    def generate_result_pdf(result_data: dict, output_path: str):
        qr_data = f"RES-{result_data.get('id', 'N/A')}|{result_data.get('roll_number', 'N/A')}|{result_data.get('semester', 'N/A')}"
        qr = qrcode.make(qr_data)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)

        doc = SimpleDocTemplate(output_path, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a2e'),
            spaceAfter=30,
            alignment=1
        )

        story.append(Paragraph("CampusOffice ERP", title_style))
        story.append(Paragraph("Result Statement", title_style))
        story.append(Spacer(1, 0.2*inch))

        data = [
            ["Result ID:", f"RES-{result_data.get('id', 'N/A')}"],
            ["Student Name:", result_data.get('student_name', 'N/A')],
            ["Register Number:", result_data.get('roll_number', 'N/A')],
            ["Semester:", result_data.get('semester', 'N/A')],
            ["GPA:", str(result_data.get('gpa', 'N/A'))],
            ["Total Marks:", str(result_data.get('total_marks', 'N/A'))],
            ["Percentage:", f"{result_data.get('percentage', 'N/A')}%"],
            ["Grade:", result_data.get('grade', 'N/A')],
            ["Status:", "PASS" if result_data.get('pass_fail') == 'pass' else "FAIL"],
            ["Published On:", result_data.get('published_at', 'N/A')],
        ]

        table = Table(data, colWidths=[2.5*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Scan QR Code for Verification:", styles['Normal']))
        story.append(Image(qr_buffer, width=1.5*inch, height=1.5*inch))
        doc.build(story)
        return output_path

    @staticmethod
    def generate_bonafide_certificate(request_data: dict, output_path: str):
        from reportlab.lib.pagesizes import landscape
        
        # Setup document in landscape mode
        doc = SimpleDocTemplate(
            output_path,
            pagesize=landscape(letter),
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )
        
        styles = getSampleStyleSheet()
        story = []

        # Logo/University Header style
        header_style = ParagraphStyle(
            'CertHeader',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#0047ab'),
            spaceAfter=5,
            alignment=1,
            fontName='Helvetica-Bold'
        )

        # Title Style
        title_style = ParagraphStyle(
            'CertTitle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=colors.HexColor('#1a1a2e'),
            spaceAfter=25,
            alignment=1,
            fontName='Helvetica-Bold'
        )

        # Body text style
        body_style = ParagraphStyle(
            'CertBody',
            parent=styles['Normal'],
            fontSize=13,
            textColor=colors.HexColor('#333333'),
            leading=24,
            alignment=1, # Centered body text matching certificate standard
            spaceAfter=30
        )

        # Signature style
        sig_label_style = ParagraphStyle(
            'CertSigLabel',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#444444'),
            leading=16,
            alignment=0 # Left aligned inside cells
        )

        # Build Certificate story
        story.append(Spacer(1, 0.4*inch))
        story.append(Paragraph("CampusOffice Institute of Technology", header_style))
        story.append(Paragraph("Bonafide Certificate", title_style))
        story.append(Spacer(1, 0.2*inch))

        date_str = datetime.now().strftime("%B %d, %Y")
        
        # Format the text with student values bolded
        body_html = f"This is to certify that <b>{request_data.get('student_name', 'N/A')}</b> (Reg No: <b>{request_data.get('roll_number', 'N/A')}</b>), is a bonafide student of <b>CampusOffice Institute of Technology</b>. He/She has been enrolled in the Department of <b>{request_data.get('department', 'N/A')}</b> under the <b>{request_data.get('quota', 'Govt Quota')}</b> scheme. This certificate is issued for the purpose of <b>{request_data.get('purpose', 'General Purpose')}</b> and is valid as of <b>{date_str}</b>."
        
        story.append(Paragraph(body_html, body_style))
        story.append(Spacer(1, 0.4*inch))

        # Bottom section: Date and Signature
        sig_data = [
            [
                Paragraph(f"<b>Date of Issuance:</b> {date_str}<br/><b>Verification ID:</b> BON-{request_data.get('id', 'N/A')}", sig_label_style),
                Paragraph("<b>Authorized Signature:</b> ___________________________<br/><b>Name:</b> Dr. A. K. Sharma<br/><b>Designation:</b> Registrar, COIT", sig_label_style)
            ]
        ]
        
        sig_table = Table(sig_data, colWidths=[3.2*inch, 3.8*inch])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(sig_table)

        # Canvas drawing callback for decorative borders
        def draw_decorations(canvas, document):
            canvas.saveState()
            # Draw double border frame
            canvas.setStrokeColor(colors.HexColor('#0047ab')) # Royal blue outer border
            canvas.setLineWidth(3)
            canvas.rect(25, 25, 742, 562) # Landscape dimensions (792 x 612)
            
            canvas.setStrokeColor(colors.HexColor('#3b82f6')) # Light blue inner border
            canvas.setLineWidth(1)
            canvas.rect(31, 31, 730, 550)
            canvas.restoreState()

        doc.build(story, onFirstPage=draw_decorations)
        return output_path

    @staticmethod
    def generate_document_certificate(data: dict, output_path: str, document_title: str = "Certificate"):
        qr_data = f"{data.get('certificate_number', 'N/A')}|{data.get('verification_code', 'N/A')}|{data.get('roll_number', 'N/A')}"
        qr = qrcode.make(qr_data)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)

        doc = SimpleDocTemplate(output_path, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        college_style = ParagraphStyle(
            'CollegeTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1a1a2e'),
            spaceAfter=6,
            alignment=1,
            fontName='Helvetica-Bold',
        )

        doc_title_style = ParagraphStyle(
            'DocumentTitle',
            parent=styles['Heading2'],
            fontSize=26,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=20,
            alignment=1,
            fontName='Helvetica-Bold',
        )

        story.append(Paragraph("CampusOffice ERP", college_style))
        story.append(Paragraph(document_title, doc_title_style))
        story.append(Spacer(1, 0.2*inch))

        cert_num_row = ["Certificate Number:", data.get('certificate_number', 'N/A')]
        issue_date_row = ["Issue Date:", data.get('issue_date', 'N/A')]
        ver_code_row = ["Verification Code:", data.get('verification_code', 'N/A')]
        student_name_row = ["Student Name:", data.get('student_name', 'N/A')]
        roll_number_row = ["Register Number:", data.get('roll_number', 'N/A')]
        dept_row = ["Department:", data.get('department', 'N/A')]
        dept_code_row = ["Department Code:", data.get('department_code', 'N/A')]
        semester_row = ["Semester:", str(data.get('semester', 'N/A'))]
        purpose_row = ["Purpose:", data.get('purpose', 'N/A')]
        academic_year_row = ["Academic Year:", data.get('academic_year', 'N/A')]
        table_data = [
            cert_num_row, issue_date_row, ver_code_row,
            student_name_row, roll_number_row, dept_row,
            dept_code_row, semester_row, purpose_row,
            academic_year_row,
        ]

        if data.get('valid_until'):
            table_data.append(["Valid Until:", data.get('valid_until', 'N/A')])

        table = Table(table_data, colWidths=[2.5*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fefce8')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#1a1a2e')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.4*inch))
        story.append(Paragraph("Issued By:", styles['Normal']))
        story.append(Paragraph(data.get('issued_by', 'Office Staff'), styles['Normal']))
        story.append(Spacer(1, 0.25*inch))
        story.append(Paragraph("Scan QR Code for Verification:", styles['Normal']))
        story.append(Image(qr_buffer, width=1.5*inch, height=1.5*inch))
        story.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.grey,
            alignment=1,
        )
        story.append(Paragraph("This document is system generated.", footer_style))
        doc.build(story)
        return output_path
