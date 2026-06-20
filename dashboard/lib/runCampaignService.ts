import { spawn } from "child_process";
import { resolve } from "path";
import { getMonorepoRoot, getPipelinePython } from "@/lib/cloudinary";

export async function runCampaignService<T>(
  command: "preview" | "send" | "list-templates",
  payload: unknown,
): Promise<T> {
  const root = getMonorepoRoot();
  const pipelineDir = resolve(root, "pipeline");
  const python = getPipelinePython();

  return new Promise((resolvePromise, reject) => {
    const child = spawn(python, ["campaign_service.py", command], {
      cwd: pipelineDir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `campaign_service exited with ${code}`));
        return;
      }

      try {
        resolvePromise(JSON.parse(stdout) as T);
      } catch {
        reject(new Error(`Invalid JSON from campaign_service: ${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
