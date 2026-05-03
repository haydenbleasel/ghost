import { requireUser } from "@/lib/session";

import { PageBody } from "../_components/page-header";
import { ProfilePanel } from "./_components/profile-panel";

const AccountPage = async () => {
  const user = await requireUser();

  return (
    <PageBody>
      <ProfilePanel
        user={{
          email: user.email,
          emailVerified: user.emailVerified,
          hasImage: Boolean(user.image),
          name: user.name ?? "",
        }}
      />
    </PageBody>
  );
};

export default AccountPage;
