import { requireSession } from "../../../lib/auth";
import { proxyRequest } from "../../../lib/proxy";

export async function GET(req: Request) {
  try {
    const session = requireSession(req);
    const userId = session.user!.id!;
    return proxyRequest(`/api/optOut/${encodeURIComponent(userId)}`);
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSession(req);
    const userId = session.user!.id!;
    return proxyRequest(`/api/optOut/${encodeURIComponent(userId)}`, {
      method: "POST",
    });
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}

export async function DELETE(req: Request) {
  try {
    const session = requireSession(req);
    const userId = session.user!.id!;
    return proxyRequest(`/api/optOut/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
