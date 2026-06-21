import PocketBase from "pocketbase";

const POCKETBASE_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  "https://pocketbase-bt4mnrpnbvdnz73hm59m4l93.deploy.princhub.com";

let _pb: PocketBase | null = null;

export function pb(): PocketBase {
  if (!_pb) {
    _pb = new PocketBase(POCKETBASE_URL);
    _pb.autoCancellation(false);
    _pb.authStore.onChange(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pb-auth-change"));
      }
    });
  }
  return _pb;
}

export { POCKETBASE_URL };
