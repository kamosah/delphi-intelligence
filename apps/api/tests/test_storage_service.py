"""Tests for filename normalization."""

import pytest

from app.utils.filename import normalize_filename


class TestFilenameSanitization:
    """Test cases for normalize_filename function."""

    @pytest.mark.parametrize(
        ("input_filename", "expected_output"),
        [
            # Emoji removal (converted to lowercase)
            ("⚖️ Document.pdf", "document.pdf"),
            ("📊 Report.xlsx", "report.xlsx"),
            ("File 😊.txt", "file.txt"),
            ("emoji_only_😊.pdf", "emoji_only.pdf"),
            ("😊😊😊.docx", "untitled.docx"),
            # Special characters (converted to lowercase)
            ("File (1).docx", "file_1.docx"),
            ("File [test].pdf", "file_test.pdf"),
            ("File {data}.csv", "file_data.csv"),
            ("File@2024.pdf", "file_2024.pdf"),
            ("File#1.txt", "file_1.txt"),
            ("File$100.xlsx", "file_100.xlsx"),
            ("File%20.pdf", "file_20.pdf"),
            ("File&More.docx", "file_more.docx"),
            ("File*Star.txt", "file_star.txt"),
            ("File+Plus.pdf", "file_plus.pdf"),
            ("File=Equal.csv", "file_equal.csv"),
            # Spaces (converted to underscores and lowercase)
            ("My Document.pdf", "my_document.pdf"),
            ("test file.pdf", "test_file.pdf"),
            ("  spaces  .txt", "spaces.txt"),
            # Multiple underscores
            ("test__file.pdf", "test_file.pdf"),
            ("test___file.pdf", "test_file.pdf"),
            ("test____multiple____underscores.pdf", "test_multiple_underscores.pdf"),
            # Leading/trailing underscores
            ("_test_.pdf", "test.pdf"),
            ("__test__.docx", "test.docx"),
            ("_leading.txt", "leading.txt"),
            ("trailing_.csv", "trailing.csv"),
            # Leading/trailing periods
            (".hidden.pdf", "hidden.pdf"),
            ("..double.txt", "double.txt"),
            ("trailing..pdf", "trailing.pdf"),
            # Mixed cases (all converted to lowercase)
            (
                "⚖️ Example Document 2_ Software Service Agreement.pdf",
                "example_document_2_software_service_agreement.pdf",
            ),
            (
                "📊 Example Document 1_ Quarterly Financial Report.pdf",
                "example_document_1_quarterly_financial_report.pdf",
            ),
            ("My (Important) File [2024].docx", "my_important_file_2024.docx"),
            # Unicode and accents (should be removed/normalized)
            ("Café.pdf", "caf.pdf"),
            ("Résumé.docx", "r_sum.docx"),
            ("日本語.txt", "untitled.txt"),  # Non-ASCII chars removed
            ("Zürich.pdf", "z_rich.pdf"),
            # Edge cases
            ("", "untitled"),
            ("...", "untitled"),
            ("___", "untitled"),
            (" ", "untitled"),
            (".", "untitled"),
            ("_.pdf", "untitled.pdf"),
            # Valid filenames (converted to lowercase)
            ("document.pdf", "document.pdf"),
            ("my_file.docx", "my_file.docx"),
            ("test-file.txt", "test_file.txt"),  # hyphens converted to underscores
            ("File123.csv", "file123.csv"),
            ("FILE_NAME.XLSX", "file_name.xlsx"),
            # No extension (converted to lowercase)
            ("document", "document"),
            ("test_file", "test_file"),
            ("⚖️ Document", "document"),
            # Multiple extensions (dots become underscores except final extension)
            ("file.tar.gz", "file_tar.gz"),
            ("backup.2024.zip", "backup_2024.zip"),
            # Long filenames with emoji (converted to lowercase)
            (
                "🎉 This is a very long filename with emoji and spaces.pdf",
                "this_is_a_very_long_filename_with_emoji_and_spaces.pdf",
            ),
        ],
    )
    def test_sanitize_filename(self, input_filename, expected_output):
        """Test filename sanitization with various inputs."""
        result = normalize_filename(input_filename)
        assert result == expected_output, f"Expected '{expected_output}', got '{result}'"

    def test_sanitize_filename_preserves_extension(self):
        """Test that file extension is always preserved (lowercase)."""
        test_cases = [
            ("file.pdf", ".pdf"),
            ("file.docx", ".docx"),
            ("file.txt", ".txt"),
            ("file.csv", ".csv"),
            ("file.xlsx", ".xlsx"),
            ("⚖️ emoji.pdf", ".pdf"),
            ("special!@#.docx", ".docx"),
            ("FILE.PDF", ".pdf"),  # Extension converted to lowercase
        ]

        for filename, expected_ext in test_cases:
            result = normalize_filename(filename)
            assert result.endswith(
                expected_ext
            ), f"Extension not preserved for '{filename}', got '{result}'"

    def test_sanitize_filename_no_empty_name(self):
        """Test that filename never results in empty string."""
        test_cases = [
            ("", "untitled"),
            ("   ", "untitled"),
            ("...", "untitled"),
            ("___", "untitled"),
            ("😊😊😊.pdf", "untitled.pdf"),
            ("⚖️.txt", "untitled.txt"),
            ("@#$%.docx", "untitled.docx"),
        ]

        for filename, expected in test_cases:
            result = normalize_filename(filename)
            assert result, f"Result is None for '{filename}'"
            assert len(result) > 0, f"Empty result for '{filename}'"
            assert result == expected, f"Expected '{expected}', got '{result}' for '{filename}'"

    def test_sanitize_filename_ascii_safe(self):
        """Test that result only contains ASCII-safe characters."""
        test_cases = [
            "⚖️ Document.pdf",
            "Café.txt",
            "日本語.docx",
            "Résumé.pdf",
            "😊 Emoji.csv",
        ]

        for filename in test_cases:
            result = normalize_filename(filename)
            # Check that result only contains ASCII characters
            assert result, f"Result is empty for '{filename}'"
            assert (
                result.isascii()
            ), f"Result '{result}' contains non-ASCII characters for input '{filename}'"

    def test_sanitize_filename_no_problematic_chars(self):
        """Test that result doesn't contain problematic characters for storage."""
        # Characters that typically cause issues in storage keys
        problematic_chars = ["<", ">", ":", '"', "|", "?", "*", "\x00"]

        test_cases = [
            "file<angle>.pdf",
            "file>angle.txt",
            "file:colon.docx",
            'file"quote.csv',
            "file|pipe.xlsx",
            "file?question.pdf",
            "file*star.txt",
        ]

        for filename in test_cases:
            result = normalize_filename(filename)
            for char in problematic_chars:
                assert (
                    char not in result
                ), f"Problematic char '{char}' found in result '{result}' for input '{filename}'"

    def test_sanitize_filename_real_world_examples(self):
        """Test with real-world file upload examples."""
        test_cases = [
            # macOS filename with emoji (all lowercase, hyphens become underscores)
            ("📄 Contract_v2 (final).pdf", "contract_v2_final.pdf"),
            # Windows filename with special chars (hyphens become underscores)
            ("Report - Q4 2024 [DRAFT].docx", "report_q4_2024_draft.docx"),
            # User-entered filename with multiple emojis
            ("🎉🎊 Party Planning 2024 🎈.xlsx", "party_planning_2024.xlsx"),
            # Screenshot filename (all lowercase, hyphens become underscores)
            ("Screenshot 2024-10-30 at 3.45.12 PM.png", "screenshot_2024_10_30_at_3_45_12_pm.png"),
            # Downloaded file with encoded spaces
            ("My%20Document.pdf", "my_20document.pdf"),
        ]

        for input_filename, expected_output in test_cases:
            result = normalize_filename(input_filename)
            assert (
                result == expected_output
            ), f"Expected '{expected_output}', got '{result}' for input '{input_filename}'"
