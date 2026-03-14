from io import BytesIO
import xlsxwriter
from typing import Dict, Any

EXCEL_FILENAME = "testcases.xlsx"
EXCEL_WORKSHEET_NAME = "Testcases"

EXCEL_HEADER_FORMAT = {
    "bold": True,
    "border": 1,
    "align": "center",
    "valign": "middle",
    "bg_color": "#D9E1F2",
    "text_wrap": True,
}
EXCEL_CELL_FORMAT = {
    "text_wrap": True,
    "valign": "top",
    "border": 1
}


async def get_filename() -> str:
    return EXCEL_FILENAME


async def generate_excel(payload: Dict[str, Any]) -> BytesIO:
    """
    Generate an Excel file from a testsuite payload and return it as an in-memory buffer.

    Args:
        payload (Dict[str, Any]): Dict with a "testcases" key containing a list of TestCase dicts.

    Returns:
        BytesIO: In-memory buffer of the generated Excel file.
    """
    buffer = BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})
    worksheet = workbook.add_worksheet(EXCEL_WORKSHEET_NAME)

    header_fmt = workbook.add_format(EXCEL_HEADER_FORMAT)
    cell_fmt = workbook.add_format(EXCEL_CELL_FORMAT)

    headers = [
        "Test Case ID",
        "Title",
        "Priority",
        "Module",
        "Description",
        "Pre-Conditions",
        "Test Steps",
        "Expected Result",
        "Post-Conditions",
        "Status",
    ]

    worksheet.write_row(0, 0, headers, header_fmt)
    worksheet.set_row(0, 30)

    row = 1
    for tc in payload.get("testcases", []):
        # Pre-conditions
        pre = "\n".join(tc.get("pre_conditions") or [])

        # Test steps — each step on its own block
        steps_lines = []
        for s in tc.get("test_steps") or []:
            line = f"Step {s.get('step_number')}: {s.get('action')}"
            if s.get("test_data"):
                line += f"\n  Data: {s.get('test_data')}"
            steps_lines.append(line)
        steps_text = "\n\n".join(steps_lines)

        # Post-conditions
        post = "\n".join(tc.get("post_conditions") or [])

        worksheet.write_row(row, 0, [
            tc.get("test_case_id", ""),
            tc.get("title", ""),
            tc.get("priority", ""),
            tc.get("module", ""),
            tc.get("description", ""),
            pre,
            steps_text,
            tc.get("expected_result", ""),
            post,
            tc.get("status", "Pending"),
        ], cell_fmt)

        # Auto-height hint — set row height proportional to step count
        step_count = len(tc.get("test_steps") or [])
        worksheet.set_row(row, max(20, step_count * 30))

        row += 1

    # Column widths
    worksheet.set_column(0, 0, 14)   # Test Case ID
    worksheet.set_column(1, 1, 35)   # Title
    worksheet.set_column(2, 2, 12)   # Priority
    worksheet.set_column(3, 3, 18)   # Module
    worksheet.set_column(4, 4, 40)   # Description
    worksheet.set_column(5, 5, 40)   # Pre-Conditions
    worksheet.set_column(6, 6, 55)   # Test Steps
    worksheet.set_column(7, 7, 45)   # Expected Result
    worksheet.set_column(8, 8, 40)   # Post-Conditions
    worksheet.set_column(9, 9, 12)   # Status

    workbook.close()
    buffer.seek(0)
    return buffer
