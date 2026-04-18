"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelCard } from "@/components/panel";
import { authClient } from "@/lib/auth-client";

interface Props {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
  };
}

export const AccountPanel = ({ user }: Props) => {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [profilePending, setProfilePending] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);

  const profileDirty = name.trim() !== user.name && name.trim().length > 0;

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
        <PanelCard as="form" onSubmit={handleProfileSubmit} className="flex flex-col gap-4 p-5">
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
            <Input id="email" name="email" type="email" value={user.email} disabled readOnly />
            <p className="text-muted-foreground text-xs">
              {user.emailVerified ? "Verified." : "Email change isn't supported yet."}
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!profileDirty || profilePending}>
              {profilePending ? "Saving…" : "Save"}
            </Button>
          </div>
        </PanelCard>
      </Panel>

      <Panel title="Password">
        <PanelCard as="form" onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 p-5">
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
