"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  type CreateLinkInput,
  createLinkSchema,
} from "@/lib/validators/link-schema";
import { api } from "@/lib/trpc/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface CreateLinkFormProps {
  onCreated: () => void;
}

export function CreateLinkForm({ onCreated }: CreateLinkFormProps) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const createMutation = api.links.create.useMutation({
    onSuccess: () => {
      toast.success("Link created successfully");
      reset();
      setOpen(false);
      onCreated();
    },
    onError: (err) => {
      setApiError(err.message);
      toast.error(err.message);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLinkInput>({
    resolver: zodResolver(createLinkSchema),
  });

  async function onSubmit(data: CreateLinkInput) {
    setApiError(null);
    createMutation.mutate(data);
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Create link
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-lg border p-4"
    >
      <div className="space-y-1">
        <Label htmlFor="create-destination-url">Destination URL</Label>
        <Input
          {...register("destinationUrl")}
          id="create-destination-url"
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
        <Label htmlFor="create-title">Title (optional)</Label>
        <Input {...register("title")} id="create-title" placeholder="My link" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="create-slug">Custom slug (optional)</Label>
        <Input
          {...register("slug")}
          id="create-slug"
          placeholder="my-custom-slug"
          aria-invalid={!!errors.slug}
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
      </div>

      {apiError && <p className="text-xs text-destructive">{apiError}</p>}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || createMutation.isPending}
        >
          {createMutation.isPending ? "Creating..." : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
