"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Panel, PanelCard } from "@/components/panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

interface Props {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
    hasImage: boolean;
  };
}

const getInitials = (name: string, email: string): string => {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

export const AccountPanel = ({ user }: Props) => {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [hasImage, setHasImage] = useState(user.hasImage);
  const [imageVersion, setImageVersion] = useState(() => Date.now());
  const [imagePending, setImagePending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [profilePending, setProfilePending] = useState(false);

  const imageSrc = hasImage
    ? `/api/account/avatar?v=${imageVersion}`
    : undefined;

  let imageButtonLabel = "Upload";
  if (imagePending) {
    imageButtonLabel = "Uploading…";
  } else if (hasImage) {
    imageButtonLabel = "Change";
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);

  const profileDirty = name.trim() !== user.name && name.trim().length > 0;

  const handleImagePicked = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setImagePending(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/account/avatar", { body, method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Upload failed");
      }
      setHasImage(true);
      setImageVersion(Date.now());
      toast.success("Photo updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setImagePending(false);
    }
  };

  const handleImageRemove = async () => {
    setImagePending(true);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Could not remove photo");
      }
      setHasImage(false);
      toast.success("Photo removed");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove photo"
      );
    } finally {
      setImagePending(false);
    }
  };

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!profileDirty) {
      return;
    }
    setProfilePending(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setProfilePending(false);
    if (error) {
      toast.error(error.message ?? "Could not update profile");
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  };

  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setPasswordPending(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPasswordPending(false);
    if (error) {
      toast.error(error.message ?? "Could not change password");
      return;
    }
    toast.success("Password changed");
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <>
      <Panel title="Profile">
        <PanelCard
          as="form"
          onSubmit={handleProfileSubmit}
          className="flex flex-col gap-4 p-5"
        >
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16">
                {imageSrc ? (
                  <AvatarImage src={imageSrc} alt={name || user.email} />
                ) : null}
                <AvatarFallback className="text-base">
                  {getInitials(name, user.email)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImagePicked}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={imagePending}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {imageButtonLabel}
                </Button>
                {hasImage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={imagePending}
                    onClick={handleImageRemove}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={user.email}
              disabled
              readOnly
            />
            <p className="text-muted-foreground text-xs">
              {user.emailVerified
                ? "Verified."
                : "Email change isn't supported yet."}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!profileDirty || profilePending}
            >
              {profilePending ? "Saving…" : "Save"}
            </Button>
          </div>
        </PanelCard>
      </Panel>

      <Panel title="Password">
        <PanelCard
          as="form"
          onSubmit={handlePasswordSubmit}
          className="flex flex-col gap-4 p-5"
        >
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-muted-foreground text-xs">
              Changing your password signs out other devices.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={passwordPending || !currentPassword || !newPassword}
            >
              {passwordPending ? "Updating…" : "Change password"}
            </Button>
          </div>
        </PanelCard>
      </Panel>
    </>
  );
};
