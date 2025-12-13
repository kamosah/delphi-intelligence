import fs from 'fs';
import os from 'os';
import path from 'path';
import { test, expect } from '../fixtures';
import { createTestOrganization, createTestSpace } from '../lib/test-data';

test.describe('Documents - Upload', () => {
  test('should upload document via UI and verify GraphQL mutation', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create organization and space
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create temporary test file
    const tmpDir = os.tmpdir();
    const testFileName = `test-document-${workerId}-${Date.now()}.pdf`;
    const testFilePath = path.join(tmpDir, testFileName);
    fs.writeFileSync(testFilePath, 'Test PDF content for upload');

    try {
      // Navigate to documents page
      await authenticatedPage.goto('/dashboard/documents');
      await authenticatedPage.waitForLoadState('networkidle');

      // Click upload button and select file
      const [fileChooser] = await Promise.all([
        authenticatedPage.waitForEvent('filechooser'),
        authenticatedPage.click('[data-testid="upload-button"]'),
      ]);

      await fileChooser.setFiles(testFilePath);

      // Wait for real GraphQL mutation to complete
      const uploadResponse = await authenticatedPage.waitForResponse(
        (response) =>
          response.url().includes('/graphql') &&
          response.request().postDataJSON()?.operationName === 'UploadDocument',
        { timeout: 30000 }
      );

      // Verify: GraphQL response is successful
      expect(uploadResponse.ok()).toBe(true);

      // Verify: Document appears in UI
      await expect(authenticatedPage.getByText(testFileName)).toBeVisible({
        timeout: 10000,
      });

      // Verify: Document status indicator shows processing or uploaded
      const statusBadge = authenticatedPage.locator(
        `[data-testid="document-status-${testFileName}"]`
      );
      await expect(statusBadge).toHaveText(/uploaded|processing/i);

      // Verify: Document exists in database with correct metadata
      const { data: document } = await supaService
        .from('documents')
        .select('*')
        .eq('name', testFileName)
        .eq('space_id', space.id)
        .single();

      expect(document).toBeDefined();
      expect(document.name).toBe(testFileName);
      expect(document.space_id).toBe(space.id);
      expect(document.uploaded_by).toBe(authenticatedUserId);
      expect(document.file_type).toContain('pdf');
      expect(['uploaded', 'processing', 'processed']).toContain(
        document.status
      );
    } finally {
      // Cleanup: Remove temporary file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should validate file type and size', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create invalid file (too large or wrong type)
    const tmpDir = os.tmpdir();
    const invalidFileName = `test-invalid-${workerId}.exe`;
    const invalidFilePath = path.join(tmpDir, invalidFileName);
    fs.writeFileSync(invalidFilePath, 'Invalid file type');

    try {
      // Navigate to documents page
      await authenticatedPage.goto('/dashboard/documents');
      await authenticatedPage.waitForLoadState('networkidle');

      // Try to upload invalid file
      const [fileChooser] = await Promise.all([
        authenticatedPage.waitForEvent('filechooser'),
        authenticatedPage.click('[data-testid="upload-button"]'),
      ]);

      await fileChooser.setFiles(invalidFilePath);

      // Verify: Error message appears
      await expect(
        authenticatedPage.getByText(/invalid file type|not supported/i)
      ).toBeVisible({ timeout: 5000 });

      // Verify: Document was NOT created in database
      const { data: documents } = await supaService
        .from('documents')
        .select('*')
        .eq('name', invalidFileName)
        .eq('space_id', space.id);

      expect(documents?.length || 0).toBe(0);
    } finally {
      // Cleanup
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
    }
  });

  test('should display upload progress', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const _space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create larger test file to see progress
    const tmpDir = os.tmpdir();
    const testFileName = `test-large-${workerId}-${Date.now()}.pdf`;
    const testFilePath = path.join(tmpDir, testFileName);

    // Create 1MB file
    const largeContent = Buffer.alloc(1024 * 1024, 'a');
    fs.writeFileSync(testFilePath, largeContent);

    try {
      // Navigate to documents page
      await authenticatedPage.goto('/dashboard/documents');
      await authenticatedPage.waitForLoadState('networkidle');

      // Start upload
      const [fileChooser] = await Promise.all([
        authenticatedPage.waitForEvent('filechooser'),
        authenticatedPage.click('[data-testid="upload-button"]'),
      ]);

      await fileChooser.setFiles(testFilePath);

      // Verify: Progress indicator appears
      await expect(
        authenticatedPage.getByTestId('upload-progress')
      ).toBeVisible({ timeout: 5000 });

      // Wait for upload to complete
      await authenticatedPage.waitForResponse(
        (response) =>
          response.url().includes('/graphql') &&
          response.request().postDataJSON()?.operationName === 'UploadDocument'
      );

      // Verify: Progress indicator disappears
      await expect(
        authenticatedPage.getByTestId('upload-progress')
      ).not.toBeVisible({ timeout: 10000 });

      // Verify: Success message appears
      await expect(
        authenticatedPage.getByText(/upload complete|uploaded successfully/i)
      ).toBeVisible();
    } finally {
      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should support multiple file uploads', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create multiple test files
    const tmpDir = os.tmpdir();
    const fileCount = 3;
    const testFiles: string[] = [];

    for (let i = 0; i < fileCount; i++) {
      const fileName = `test-multi-${workerId}-${i}-${Date.now()}.pdf`;
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, `Test content ${i}`);
      testFiles.push(filePath);
    }

    try {
      // Navigate to documents page
      await authenticatedPage.goto('/dashboard/documents');
      await authenticatedPage.waitForLoadState('networkidle');

      // Upload all files
      const [fileChooser] = await Promise.all([
        authenticatedPage.waitForEvent('filechooser'),
        authenticatedPage.click('[data-testid="upload-button"]'),
      ]);

      await fileChooser.setFiles(testFiles);

      // Wait for all uploads to complete
      let uploadCount = 0;
      while (uploadCount < fileCount) {
        await authenticatedPage.waitForResponse(
          (response) =>
            response.url().includes('/graphql') &&
            response.request().postDataJSON()?.operationName ===
              'UploadDocument'
        );
        uploadCount++;
      }

      // Verify: All files appear in UI
      for (const filePath of testFiles) {
        const fileName = path.basename(filePath);
        await expect(authenticatedPage.getByText(fileName)).toBeVisible();
      }

      // Verify: All files in database
      const { data: documents } = await supaService
        .from('documents')
        .select('*')
        .eq('space_id', space.id);

      expect(documents?.length || 0).toBeGreaterThanOrEqual(fileCount);

      // Verify each file exists
      for (const filePath of testFiles) {
        const fileName = path.basename(filePath);
        const doc = documents?.find((d) => d.name === fileName);
        expect(doc).toBeDefined();
        expect(doc?.uploaded_by).toBe(authenticatedUserId);
      }
    } finally {
      // Cleanup
      for (const filePath of testFiles) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  });

  test('should handle upload failures gracefully', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const _space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create test file
    const tmpDir = os.tmpdir();
    const testFileName = `test-fail-${workerId}-${Date.now()}.pdf`;
    const testFilePath = path.join(tmpDir, testFileName);
    fs.writeFileSync(testFilePath, 'Test content');

    try {
      // Navigate to documents page
      await authenticatedPage.goto('/dashboard/documents');
      await authenticatedPage.waitForLoadState('networkidle');

      // Mock network failure (disconnect during upload)
      await authenticatedPage.context().setOffline(true);

      // Try to upload
      const [fileChooser] = await Promise.all([
        authenticatedPage.waitForEvent('filechooser'),
        authenticatedPage.click('[data-testid="upload-button"]'),
      ]);

      await fileChooser.setFiles(testFilePath);

      // Verify: Error message appears
      await expect(
        authenticatedPage.getByText(/upload failed|network error/i)
      ).toBeVisible({ timeout: 10000 });

      // Restore network
      await authenticatedPage.context().setOffline(false);

      // Verify: User can retry upload
      await expect(
        authenticatedPage.getByTestId('retry-upload-button')
      ).toBeEnabled();
    } finally {
      // Cleanup
      await authenticatedPage.context().setOffline(false);
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
