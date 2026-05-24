"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import {
  type UpdateLinkInput,
  updateLinkSchema,
} from "@/lib/validators/link-schema";
import type { Link } from "./types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";

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
  const {
    register,
    handleSubmit,
    control,
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
    const res = await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      onUpdated();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="edit-title">Title</Label>
            <Input
              {...register("title")}
              id="edit-title"
              placeholder="My link"
            />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-is-active"
                  checked={field.value ?? false}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <Label htmlFor="edit-is-active">Active</Label>
              </div>
            )}
          />

          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
