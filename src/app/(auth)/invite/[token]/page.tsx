import { InviteAcceptClient } from "./invite-client";

type Params = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Params) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <InviteAcceptClient token={token} />
    </div>
  );
}
