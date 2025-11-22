'use client';

import { useState } from 'react';
import { MoreHorizontal, Star, Edit2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
} from '@olympus/ui';
import { useUpdateThread, useDeleteThread } from '@/hooks/useThreads';
import type { Thread } from '@/lib/api/generated';

interface ThreadRowActionsProps {
  thread: Thread;
}

export function ThreadRowActions({ thread }: ThreadRowActionsProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newTitle, setNewTitle] = useState(thread.title || '');

  const { updateThread, isUpdating } = useUpdateThread();
  const { deleteThread, isDeleting } = useDeleteThread();

  const handleToggleStar = async () => {
    await updateThread({
      id: thread.id,
      input: {
        isStarred: !thread.isStarred,
      },
    });
  };

  const handleOpenRenameDialog = () => {
    setNewTitle(thread.title || thread.queryText.slice(0, 50));
    setShowRenameDialog(true);
  };

  const handleRenameConfirm = async () => {
    if (newTitle.trim()) {
      await updateThread({
        id: thread.id,
        input: {
          title: newTitle.trim(),
        },
      });
      setShowRenameDialog(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTitle(e.target.value);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTitle.trim()) {
      handleRenameConfirm();
    }
  };

  const handleCancelRename = () => {
    setShowRenameDialog(false);
  };

  const handleOpenDeleteDialog = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteThread({ id: thread.id });
    setShowDeleteDialog(false);
  };

  const threadTitle = thread.title || thread.queryText.slice(0, 50);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={handleToggleStar}>
            <Star
              className={`mr-2 h-4 w-4 ${thread.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
            {thread.isStarred ? 'Unstar' : 'Star'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenRenameDialog}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleOpenDeleteDialog}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
            <DialogDescription>
              Enter a new title for this thread
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Thread Title</Label>
            <Input
              id="title"
              value={newTitle}
              onChange={handleTitleChange}
              placeholder="Enter thread title"
              onKeyDown={handleTitleKeyDown}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRename}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={!newTitle.trim() || isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{threadTitle}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
