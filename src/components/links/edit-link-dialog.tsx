"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  type UpdateLinkInput,
  updateLinkSchema,
} from "@/lib/validators/link-schema";
import { api } from "@/lib/trpc/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import type { Link } from "./types";

interface EditLinkDialogProps {
  link: Link;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditLinkDialog({
  link,
  onClose,
  onUpdated,
}: EditLinkDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null);

  const updateMutation = api.links.update.useMutation({
    onSuccess: () => {
      onUpdated();
    },
    onError: (err) => {
      setApiError(err.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateLinkInput>({
    resolver: zodResolver(updateLinkSchema),
    defaultValues: {
      destinationUrl: link.destinationUrl,
      title: link.title,
      isActive: link.isActive,
    },
  });

  async function onSubmit(data: UpdateLinkInput) {
    setApiError(null);
    updateMutation.mutate({ id: link.id, ...data });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-3 rounded-lg border bg-background p-4 shadow-lg"
      >
        <h2 className="text-lg font-semibold">Edit link</h2>

        <div className="space-y-1">
          <Label htmlFor="edit-destination-url">Destination URL</Label>
          <Input
            {...register("destinationUrl")}
            id="edit-destination-url"
            placeholder="https://example.com"
            aria-invalid={!!errors.destinationUrl}
          />
          {errors.destinationUrl && (
            <p className="text-xs text-destructive">
              {errors.destinationUrl.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-title">Title (optional)</Label>
          <Input {...register("title")} id="edit-title" placeholder="My link" />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox {...register("isActive")} id="edit-is-active" />
          <Label htmlFor="edit-is-active">Active</Label>
        </div>

        {apiError && <p className="text-xs text-destructive">{apiError}</p>}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
