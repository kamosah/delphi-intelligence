"""Tests for StorageService filename sanitization."""

import pytest

from app.services.storage_service import StorageService


class TestFilenameSanitization:
    """Test cases for _sanitize_filename method."""

    @pytest.fixture
    def storage_service(self):
        """Create a StorageService instance for testing."""
        return StorageService()

    @pytest.mark.parametrize(
        "input_filename,expected_output",
        [
            # Emoji removal
            ("⚖️ Document.pdf", "Document.pdf"),
            ("📊 Report.xlsx", "Report.xlsx"),
            ("File 😊.txt", "File.txt"),
            ("emoji_only_😊.pdf", "emoji_only.pdf"),
            ("😊😊😊.docx", "document.docx"),
            # Special characters
            ("File (1).docx", "File_1.docx"),
            ("File [test].pdf", "File_test.pdf"),
            ("File {data}.csv", "File_data.csv"),
            ("File@2024.pdf", "File_2024.pdf"),
            ("File#1.txt", "File_1.txt"),
            ("File$100.xlsx", "File_100.xlsx"),
            ("File%20.pdf", "File_20.pdf"),
            ("File&More.docx", "File_More.docx"),
            ("File*Star.txt", "File_Star.txt"),
            ("File+Plus.pdf", "File_Plus.pdf"),
            ("File=Equal.csv", "File_Equal.csv"),
            # Spaces
            ("My Document.pdf", "My_Document.pdf"),
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
            # Mixed cases
            ("⚖️ Example Document 2_ Software Service Agreement.pdf", "Example_Document_2_Software_Service_Agreement.pdf"),
            ("📊 Example Document 1_ Quarterly Financial Report.pdf", "Example_Document_1_Quarterly_Financial_Report.pdf"),
            ("My (Important) File [2024].docx", "My_Important_File_2024.docx"),
            # Unicode and accents (should be removed/normalized)
            ("Café.pdf", "Cafe.pdf"),
            ("Résumé.docx", "Resume.docx"),
            ("日本語.txt", "document.txt"),  # Non-ASCII chars removed
            ("Zürich.pdf", "Zurich.pdf"),
            # Edge cases
            ("", "untitled"),
            ("...", "untitled"),
            ("___", "untitled"),
            (" ", "untitled"),
            (".", "untitled"),
            ("_.pdf", "document.pdf"),
            # Valid filenames (should remain mostly unchanged)
            ("document.pdf", "document.pdf"),
            ("my_file.docx", "my_file.docx"),
            ("test-file.txt", "test-file.txt"),
            ("File123.csv", "File123.csv"),
            ("FILE_NAME.XLSX", "FILE_NAME.XLSX"),
            # No extension
            ("document", "document"),
            ("test_file", "test_file"),
            ("⚖️ Document", "Document"),
            # Multiple extensions
            ("file.tar.gz", "file.tar.gz"),
            ("backup.2024.zip", "backup.2024.zip"),
            # Long filenames with emoji
            ("🎉 This is a very long filename with emoji and spaces.pdf", "This_is_a_very_long_filename_with_emoji_and_spaces.pdf"),
        ],
    )
    def test_sanitize_filename(self, storage_service, input_filename, expected_output):
        """Test filename sanitization with various inputs."""
        result = storage_service._sanitize_filename(input_filename)
        assert result == expected_output, f"Expected '{expected_output}', got '{result}'"

    def test_sanitize_filename_preserves_extension(self, storage_service):
        """Test that file extension is always preserved."""
        test_cases = [
            ("file.pdf", ".pdf"),
            ("file.docx", ".docx"),
            ("file.txt", ".txt"),
            ("file.csv", ".csv"),
            ("file.xlsx", ".xlsx"),
            ("⚖️ emoji.pdf", ".pdf"),
            ("special!@#.docx", ".docx"),
        ]

        for filename, expected_ext in test_cases:
            result = storage_service._sanitize_filename(filename)
            assert result.endswith(expected_ext), f"Extension not preserved for '{filename}'"

    def test_sanitize_filename_no_empty_name(self, storage_service):
        """Test that filename never results in empty string."""
        test_cases = [
            ("", "untitled"),
            ("   ", "untitled"),
            ("...", "untitled"),
            ("___", "untitled"),
            ("😊😊😊.pdf", "document.pdf"),
            ("⚖️.txt", "document.txt"),
            ("@#$%.docx", "document.docx"),
        ]

        for filename, expected in test_cases:
            result = storage_service._sanitize_filename(filename)
            assert result and len(result) > 0, f"Empty result for '{filename}'"
            assert result == expected, f"Expected '{expected}', got '{result}' for '{filename}'"

    def test_sanitize_filename_ascii_safe(self, storage_service):
        """Test that result only contains ASCII-safe characters."""
        test_cases = [
            "⚖️ Document.pdf",
            "Café.txt",
            "日本語.docx",
            "Résumé.pdf",
            "😊 Emoji.csv",
        ]

        for filename in test_cases:
            result = storage_service._sanitize_filename(filename)
            # Check that result only contains ASCII characters
            assert result.isascii(), f"Result '{result}' contains non-ASCII characters"

    def test_sanitize_filename_no_problematic_chars(self, storage_service):
        """Test that result doesn't contain problematic characters for storage."""
        # Characters that typically cause issues in storage keys
        problematic_chars = ['<', '>', ':', '"', '|', '?', '*', '\x00']

        test_cases = [
            'file<angle>.pdf',
            'file>angle.txt',
            'file:colon.docx',
            'file"quote.csv',
            'file|pipe.xlsx',
            'file?question.pdf',
            'file*star.txt',
        ]

        for filename in test_cases:
            result = storage_service._sanitize_filename(filename)
            for char in problematic_chars:
                assert char not in result, f"Problematic char '{char}' found in result '{result}'"

    def test_sanitize_filename_real_world_examples(self, storage_service):
        """Test with real-world file upload examples."""
        test_cases = [
            # macOS filename with emoji
            ("📄 Contract_v2 (final).pdf", "Contract_v2_final.pdf"),
            # Windows filename with special chars (hyphen is preserved as valid char)
            ("Report - Q4 2024 [DRAFT].docx", "Report_-_Q4_2024_DRAFT.docx"),
            # User-entered filename with multiple emojis
            ("🎉🎊 Party Planning 2024 🎈.xlsx", "Party_Planning_2024.xlsx"),
            # Screenshot filename
            ("Screenshot 2024-10-30 at 3.45.12 PM.png", "Screenshot_2024-10-30_at_3.45.12_PM.png"),
            # Downloaded file with encoded spaces
            ("My%20Document.pdf", "My_20Document.pdf"),
        ]

        for input_filename, expected_output in test_cases:
            result = storage_service._sanitize_filename(input_filename)
            assert result == expected_output, f"Expected '{expected_output}', got '{result}'"
