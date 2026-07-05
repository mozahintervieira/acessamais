import type { KnowledgeAsset } from "@acessa-plus/types";

export class KnowledgeRegistry {
  private readonly assets = new Map<string, KnowledgeAsset>();

  register(asset: KnowledgeAsset): void {
    this.assets.set(this.key(asset.id, asset.version), asset);
  }

  getActive(assetId: string): KnowledgeAsset | undefined {
    return [...this.assets.values()].find(
      (asset) => asset.id === assetId && asset.status === "ACTIVE"
    );
  }

  listActiveByType(type: KnowledgeAsset["type"]): KnowledgeAsset[] {
    return [...this.assets.values()].filter(
      (asset) => asset.type === type && asset.status === "ACTIVE"
    );
  }

  listActive(): KnowledgeAsset[] {
    return [...this.assets.values()].filter(
      (asset) => asset.status === "ACTIVE"
    );
  }

  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }
}
