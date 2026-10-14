/**
 * YouTube lesson videos — upload via Upload-Post, playback via Piped.
 *
 * A lesson chooses its video source in the admin dashboard:
 *   - "cloud"   → the private Backblaze B2 bucket (see videoStorage.js), signed URLs.
 *   - "youtube" → the video lives on the academy's YouTube channel as UNLISTED.
 *
 * Upload (admin only):
 *   The dashboard sends the file to this server, which forwards it to Upload-Post
 *   (https://www.upload-post.com) with privacyStatus=unlisted. Upload-Post uploads through
 *   its own audited YouTube setup, so no Google Cloud project/audit is needed here.
 *   Required env (see .env.example):
 *     UPLOAD_POST_API_KEY    API key from the Upload-Post dashboard (server secret)
 *     UPLOAD_POST_PROFILE    the Upload-Post profile whose YouTube channel is connected
 *   A lesson can also be linked by pasting an existing unlisted video URL/ID — no
 *   Upload-Post account is needed for that path.
 *
 * Playback (learners):
 *   The server asks a Piped API instance for /streams/:videoId and hands the app a plain
 *   stream URL, so the app's own expo-video player shows it with YDU controls and no
 *   YouTube branding. Stream URLs are never stored; they are fetched fresh per play.
 *   Optional env:
 *     PIPED_API_BASE_URLS    comma-separated Piped API bases, tried in order
 *     UPLOAD_POST_API_URL    override the Upload-Post API base (testing)
 *
 * The unlisted video ID is itself the "link secret", so it is stored server-side only
 * and stripped from the public catalog (see catalog.controller.js).
 */
import '../config/env.js';
import fs from 'node:fs';

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts the 11-character video ID from a raw ID or any common YouTube URL
 * (watch, youtu.be, shorts, live, embed, music). Returns '' when nothing matches.
 */
export function extractYouTubeVideoId(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (YOUTUBE_ID_PATTERN.test(input)) return input;
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`);
    const host = url.hostname.replace(/^(www\.|m\.)/, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return YOUTUBE_ID_PATTERN.test(id) ? id : '';
    }
    if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      const fromQuery = url.searchParams.get('v') || '';
      if (YOUTUBE_ID_PATTERN.test(fromQuery)) return fromQuery;
      const parts = url.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex((p) => ['shorts', 'live', 'embed', 'v'].includes(p));
      const id = marker >= 0 ? parts[marker + 1] || '' : '';
      return YOUTUBE_ID_PATTERN.test(id) ? id : '';
    }
  } catch {
    /* not a URL at all */
  }
  return '';
}

export const youtubeWatchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

// ---------------------------------------------------------------------------
// Upload via Upload-Post
// ---------------------------------------------------------------------------

const uploadPostApiKey = process.env.UPLOAD_POST_API_KEY || '';
const uploadPostProfile = process.env.UPLOAD_POST_PROFILE || '';
const uploadPostBase = (process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com').replace(/\/+$/, '');

export const youtubeUploadConfigured = Boolean(uploadPostApiKey && uploadPostProfile);

export function youtubeUploadProblem() {
  if (youtubeUploadConfigured) return null;
  return 'Set UPLOAD_POST_API_KEY and UPLOAD_POST_PROFILE in server/.env (connect the YouTube channel on upload-post.com first), then restart the server';
}

async function uploadPostFetch(path, options = {}) {
  const res = await fetch(`${uploadPostBase}${path}`, {
    ...options,
    headers: { Authorization: `Apikey ${uploadPostApiKey}`, ...(options.headers || {}) },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const message = data?.error || data?.message || `Upload-Post answered ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data || {};
}

/** Finds a YouTube video ID anywhere inside an Upload-Post response (sync or polled). */
function videoIdFromUploadPostPayload(payload) {
  const direct = [
    payload?.results?.youtube?.url,
    payload?.results?.youtube?.post_url,
    payload?.results?.youtube?.video_id,
    payload?.results?.youtube?.id,
    payload?.url,
    payload?.post_url,
  ];
  for (const value of direct) {
    const id = typeof value === 'string' ? extractYouTubeVideoId(value) || (YOUTUBE_ID_PATTERN.test(value) ? value : '') : '';
    if (id) return id;
  }
  const results = Array.isArray(payload?.results) ? payload.results : [];
  for (const result of results) {
    if (result?.platform && result.platform !== 'youtube') continue;
    for (const value of [result?.post_url, result?.url, result?.video_id, result?.post_id, result?.id]) {
      if (typeof value !== 'string') continue;
      const id = extractYouTubeVideoId(value) || (YOUTUBE_ID_PATTERN.test(value) ? value : '');
      if (id) return id;
    }
  }
  return '';
}

/**
 * Uploads one video file to the connected YouTube channel as UNLISTED.
 * Upload-Post sometimes finishes in the background; in that case this resolves with
 * { status: 'processing', requestId } and the caller polls getYouTubeUploadStatus.
 */
export async function uploadYouTubeVideo({ filePath, fileName, contentType, title, description }) {
  const form = new FormData();
  // openAsBlob streams the file off disk; older Node falls back to reading it in.
  const blob = fs.openAsBlob
    ? await fs.openAsBlob(filePath, { type: contentType || 'video/mp4' })
    : new Blob([await fs.promises.readFile(filePath)], { type: contentType || 'video/mp4' });
  form.append('video', blob, fileName || 'lesson.mp4');
  form.append('title', title);
  if (description) form.append('description', description);
  form.append('user', uploadPostProfile);
  form.append('platform[]', 'youtube');
  form.append('privacyStatus', 'unlisted');
  form.append('selfDeclaredMadeForKids', 'false');

  const data = await uploadPostFetch('/api/upload', { method: 'POST', body: form });
  const videoId = videoIdFromUploadPostPayload(data);
  if (videoId) return { status: 'completed', videoId, url: youtubeWatchUrl(videoId) };

  const youtubeResult = data?.results?.youtube;
  if (youtubeResult && youtubeResult.success === false) {
    throw new Error(youtubeResult.error || youtubeResult.message || 'YouTube upload failed on Upload-Post');
  }
  if (data.request_id || data.job_id) {
    return { status: 'processing', requestId: String(data.request_id || data.job_id) };
  }
  if (data.success === false) throw new Error(data.error || data.message || 'YouTube upload failed on Upload-Post');
  throw new Error('Upload-Post accepted the upload but returned no video ID. Check the Upload-Post dashboard.');
}

/** Poll target for a background Upload-Post job. */
export async function getYouTubeUploadStatus(requestId) {
  const data = await uploadPostFetch(`/api/uploadposts/status?request_id=${encodeURIComponent(requestId)}`);
  const videoId = videoIdFromUploadPostPayload(data);
  if (videoId) return { status: 'completed', videoId, url: youtubeWatchUrl(videoId) };

  const results = Array.isArray(data.results) ? data.results : [];
  const youtube = results.find((r) => r?.platform === 'youtube');
  if (youtube?.success === false || youtube?.status === 'failed') {
    return { status: 'failed', error: youtube.error || youtube.message || 'YouTube upload failed on Upload-Post' };
  }
  if (data.status === 'failed' || data.status === 'not_found') {
    return { status: 'failed', error: data.message || 'YouTube upload failed on Upload-Post' };
  }
  if (data.status === 'completed' && youtube && youtube.success !== true) {
    return { status: 'failed', error: youtube.message || 'YouTube upload did not complete' };
  }
  return { status: 'processing' };
}

// ---------------------------------------------------------------------------
// Playback via Piped
// ---------------------------------------------------------------------------

const DEFAULT_PIPED_INSTANCES = [
  'https://pipedapi.ducks.party',
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
];

export const pipedInstances = (process.env.PIPED_API_BASE_URLS || '')
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean)
  .concat(DEFAULT_PIPED_INSTANCES)
  .filter((value, index, list) => list.indexOf(value) === index);

const FETCH_TIMEOUT_MS = 9000;
/** Stream links are signed for a few hours; report one hour so the app re-asks in good time. */
export const PIPED_PLAYBACK_TTL_SECONDS = 60 * 60;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // Some public instances refuse obvious script clients; a plain browser UA is honoured.
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      },
    });
    if (!res.ok) throw new Error(`answered ${res.status}`);
    const data = await res.json();
    if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const fetchPipedStreams = (base, videoId) => fetchJson(`${base}/streams/${encodeURIComponent(videoId)}`);

/**
 * Picks what the app's player should stream from one Piped /streams payload.
 * Preference order (both iOS and Android must cope):
 *   1. an HLS playlist (adaptive, plays everywhere) when the caller wants Auto,
 *   2. the best combined MP4 (audio+video in one file), honouring a quality cap,
 *   3. an HLS stream listed among the video streams,
 *   4. the DASH manifest (Android only, but better than nothing).
 * Video-only streams are never returned alone — they would play silent.
 */
export function pickPipedStream(data, quality = '') {
  const streams = Array.isArray(data?.videoStreams) ? data.videoStreams : [];
  const combinedMp4 = streams
    .filter((s) => s && s.url && !s.videoOnly && /video\/mp4/i.test(s.mimeType || '') && Number(s.height) > 0)
    .sort((a, b) => Number(b.height) - Number(a.height));
  const qualities = [...new Set(combinedMp4.map((s) => String(s.height)))];
  if (typeof data?.hls === 'string' && data.hls) qualities.unshift('auto');

  const want = /^\d+$/.test(String(quality)) ? Number(quality) : null;
  if ((quality === 'auto' || (!want && typeof data?.hls === 'string' && data.hls))) {
    if (typeof data?.hls === 'string' && data.hls) {
      return { url: data.hls, quality: 'auto', qualities, format: 'hls' };
    }
  }
  if (combinedMp4.length) {
    const chosen = want
      ? combinedMp4.find((s) => Number(s.height) <= want) || combinedMp4[combinedMp4.length - 1]
      : combinedMp4[0];
    return { url: chosen.url, quality: String(chosen.height), qualities, format: 'mp4' };
  }
  const hlsStream = streams.find((s) => s?.url && !s.videoOnly && /mpegurl|hls/i.test(`${s.mimeType || ''} ${s.format || ''}`));
  if (hlsStream) return { url: hlsStream.url, quality: 'auto', qualities: qualities.length ? qualities : ['auto'], format: 'hls' };
  const anyCombined = streams.find((s) => s?.url && !s.videoOnly);
  if (anyCombined) return { url: anyCombined.url, quality: 'auto', qualities: qualities.length ? qualities : ['auto'], format: 'stream' };
  if (typeof data?.dash === 'string' && data.dash) {
    return { url: data.dash, quality: 'auto', qualities: qualities.length ? qualities : ['auto'], format: 'dash' };
  }
  return null;
}

/**
 * Fallback chain for one video: every Piped instance first, then every Invidious
 * instance (same job, different project — one being down must not stop a lesson).
 * The two lists are independent on purpose: these are third-party servers.
 */
const DEFAULT_INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://inv.nadeko.net',
  'https://invidious.privacyredirect.com',
];

export const invidiousInstances = (process.env.INVIDIOUS_API_BASE_URLS || '')
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean)
  .concat(DEFAULT_INVIDIOUS_INSTANCES)
  .filter((value, index, list) => list.indexOf(value) === index);

/** Picks a playable stream from one Invidious /api/v1/videos payload (combined files first, then HLS). */
export function pickInvidiousStream(data, base, quality = '') {
  const formats = (Array.isArray(data?.formatStreams) ? data.formatStreams : [])
    .filter((s) => s?.url && /video\/mp4/i.test(s.type || ''))
    .map((s) => ({ url: s.url, height: Number(String(s.qualityLabel || '').replace(/\D/g, '')) || 0 }))
    .filter((s) => s.height > 0)
    .sort((a, b) => b.height - a.height);
  const qualities = [...new Set(formats.map((s) => String(s.height)))];
  const want = /^\d+$/.test(String(quality)) ? Number(quality) : null;
  if (formats.length) {
    const chosen = want ? formats.find((s) => s.height <= want) || formats[formats.length - 1] : formats[0];
    return { url: chosen.url, quality: String(chosen.height), qualities, format: 'mp4' };
  }
  if (typeof data?.hlsUrl === 'string' && data.hlsUrl) {
    const url = data.hlsUrl.startsWith('http') ? data.hlsUrl : `${base}${data.hlsUrl}`;
    return { url, quality: 'auto', qualities: qualities.length ? qualities : ['auto'], format: 'hls' };
  }
  return null;
}

/**
 * Resolves a playable stream for one YouTube video ID.
 * Throws an Error whose `upstream` carries what the instances actually said,
 * so the admin test endpoint (and server logs) can name the real problem.
 */
export async function resolveYouTubePlayback(videoId, quality = '') {
  const failures = [];
  for (const base of pipedInstances) {
    try {
      const data = await fetchPipedStreams(base, videoId);
      const picked = pickPipedStream(data, quality);
      if (!picked) throw new Error('no playable stream in the response');
      return {
        ...picked,
        provider: 'piped',
        instance: base,
        title: typeof data.title === 'string' ? data.title : '',
        visibility: typeof data.visibility === 'string' ? data.visibility : '',
        durationSec: Number(data.duration) || 0,
      };
    } catch (err) {
      failures.push(`piped ${base}: ${err?.message || err}`);
    }
  }
  for (const base of invidiousInstances) {
    try {
      const data = await fetchJson(`${base}/api/v1/videos/${encodeURIComponent(videoId)}`);
      const picked = pickInvidiousStream(data, base, quality);
      if (!picked) throw new Error('no playable stream in the response');
      return {
        ...picked,
        provider: 'invidious',
        instance: base,
        title: typeof data.title === 'string' ? data.title : '',
        visibility: '',
        durationSec: Number(data.lengthSeconds) || 0,
      };
    } catch (err) {
      failures.push(`invidious ${base}: ${err?.message || err}`);
    }
  }
  console.error(`[youtube-playback] could not resolve ${videoId}:`, failures.join(' | '));
  const err = new Error('This lesson video could not be played right now. Check your connection and try again.');
  err.status = 502;
  err.upstream = failures.join(' | ');
  throw err;
}

/** Backwards-compatible name: the provider in the result says which chain answered. */
export const getPipedPlayback = resolveYouTubePlayback;

/**
 * Admin-side health check for one linked video: can the playback chain actually
 * stream it right now? Returns the real upstream reason when it cannot (private
 * video, bot check, instance down…), which is what the dashboard shows.
 */
export async function checkYouTubeVideo(videoId) {
  try {
    const playback = await resolveYouTubePlayback(videoId);
    return {
      ok: true,
      provider: playback.provider,
      instance: playback.instance,
      format: playback.format,
      quality: playback.quality,
      qualities: playback.qualities,
      title: playback.title,
      visibility: playback.visibility,
    };
  } catch (err) {
    return { ok: false, error: err.upstream || err.message || 'Playback check failed' };
  }
}
