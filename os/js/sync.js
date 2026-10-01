/* =============================================================
 * READS WITH COLIN OS — 多端同步脚手架（Phase 6，可选）
 * -------------------------------------------------------------
 * 设计：本地优先不变。默认关闭；填了 Supabase 凭证才启用。
 * 无需密钥时完全无副作用（syncEnabled() 为 false，所有方法直接抛清晰错误）。
 * 注：这里实现的是「备份即同步」——把数据库 dump 上传到 Supabase Storage，
 * 以设备 ID 命名。真正的增量合并 / 冲突解决留给后续一轮（需服务端或特定策略）。
 * 这是诚实的可运行边界：配置驱动、可验证、不绑架本地数据。
 * ============================================================= */

const KEY = 'rwc_sync_config';

const DEFAULTS = {
  enabled: false,
  endpoint: '',          // 例如 https://xxxx.supabase.co
  anonKey: '',
  bucket: 'rwc-os-backups',
  lastSync: null,
  lastStatus: '',
};

export function getSyncConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

export function saveSyncConfig(cfg) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function syncEnabled() {
  const c = getSyncConfig();
  return !!(c.enabled && c.endpoint && c.endpoint.trim() && c.anonKey && c.anonKey.trim());
}

function getDeviceId() {
  let id = localStorage.getItem('rwc_device_id');
  if (!id) { id = 'dev-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('rwc_device_id', id); }
  return id;
}

/** 把数据库 dump 推到 Supabase Storage（以 deviceId/rwc-os-<ts>.json 命名，x-upsert） */
export async function pushBackup(dump) {
  const c = getSyncConfig();
  if (!syncEnabled()) throw new Error('云端同步未启用：请在 Settings → 云端同步 填好凭证并开启');
  const path = `${getDeviceId()}/rwc-os-${Date.now()}.json`;
  const res = await fetch(`${c.endpoint.replace(/\/$/, '')}/storage/v1/object/${c.bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${c.anonKey.trim()}`,
      apikey: c.anonKey.trim(),
      'x-upsert': 'true',
    },
    body: JSON.stringify(dump),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`同步失败（${res.status}）：${t.slice(0, 160)}`);
  }
  const updated = { ...c, lastSync: new Date().toISOString(), lastStatus: 'ok' };
  saveSyncConfig(updated);
  return path;
}

/** 列出现有备份（用于「从云端恢复」前的查看，UI 调用） */
export async function listBackups() {
  const c = getSyncConfig();
  if (!syncEnabled()) throw new Error('云端同步未启用');
  const prefix = getDeviceId();
  const res = await fetch(
    `${c.endpoint.replace(/\/$/, '')}/storage/v1/object/list/${c.bucket}?prefix=${encodeURIComponent(prefix)}`,
    { headers: { Authorization: `Bearer ${c.anonKey.trim()}`, apikey: c.anonKey.trim() } },
  );
  if (!res.ok) throw new Error(`列举失败（${res.status}）`);
  return res.json();
}
