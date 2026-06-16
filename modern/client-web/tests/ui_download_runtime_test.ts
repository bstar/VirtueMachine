import assert from "node:assert/strict";
import {
  capturedFileTextRuntime,
  downloadCanvasPngRuntime,
  downloadJsonFileRuntime,
  jsonBlobRuntime,
  triggerDownloadRuntime
} from "../ui/download_runtime.ts";

function fakeDocument() {
  const created: Array<{
    clickCount: number;
    download: string;
    href: string;
    removeCount: number;
  }> = [];
  const doc = {
    body: {
      appended: [] as unknown[],
      appendChild(node: unknown) {
        this.appended.push(node);
      }
    },
    createElement(tag: string) {
      assert.equal(tag, "a");
      const link = {
        clickCount: 0,
        download: "",
        href: "",
        removeCount: 0,
        click() {
          this.clickCount += 1;
        },
        remove() {
          this.removeCount += 1;
        }
      };
      created.push(link);
      return link;
    }
  };
  return { created, doc: doc as unknown as Document };
}

assert.equal(capturedFileTextRuntime("shot.png"), "Captured shot.png");

{
  const { created, doc } = fakeDocument();
  triggerDownloadRuntime({ document: doc, filename: "file.txt", href: "blob:1" });
  assert.equal(created.length, 1);
  assert.deepEqual({
    clickCount: created[0].clickCount,
    download: created[0].download,
    href: created[0].href,
    removeCount: created[0].removeCount
  }, {
    clickCount: 1,
    download: "file.txt",
    href: "blob:1",
    removeCount: 1
  });
}

{
  const { created, doc } = fakeDocument();
  const canvas = {
    toDataURL(kind: string) {
      assert.equal(kind, "image/png");
      return "data:image/png;base64,abc";
    }
  } as HTMLCanvasElement;
  downloadCanvasPngRuntime({ canvas, document: doc, filename: "shot.png" });
  assert.equal(created[0].href, "data:image/png;base64,abc");
  assert.equal(created[0].download, "shot.png");
}

{
  const blob = jsonBlobRuntime({ ok: true });
  assert.equal(blob.type, "application/json");
}

{
  const { created, doc } = fakeDocument();
  const calls: string[] = [];
  downloadJsonFileRuntime({
    data: { ok: true },
    document: doc,
    filename: "data.json",
    url: {
      createObjectURL(blob: Blob) {
        calls.push(`${blob.type}:create`);
        return "blob:data";
      },
      revokeObjectURL(url: string) {
        calls.push(`${url}:revoke`);
      }
    }
  });
  assert.equal(created[0].href, "blob:data");
  assert.equal(created[0].download, "data.json");
  assert.deepEqual(calls, ["application/json:create", "blob:data:revoke"]);
}

console.log("ui_download_runtime_test: ok");
