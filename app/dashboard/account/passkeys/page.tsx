import { requireUser } from "@/lib/session";

import { PageBody } from "../../components/page-header";
import { PasskeysPanel } from "../components/passkeys-panel";

const PasskeysPage = async () => {
  await requireUser();

  return (
    <PageBody>
      <PasskeysPanel />
    </PageBody>
  );
};

export default PasskeysPage;
