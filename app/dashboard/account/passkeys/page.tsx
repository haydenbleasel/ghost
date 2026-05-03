import { requireUser } from "@/lib/session";

import { PageBody } from "../../_components/page-header";
import { PasskeysPanel } from "../_components/passkeys-panel";

const PasskeysPage = async () => {
  await requireUser();

  return (
    <PageBody>
      <PasskeysPanel />
    </PageBody>
  );
};

export default PasskeysPage;
