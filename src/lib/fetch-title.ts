/**
 * HTMLエンティティをデコード（より包括的に）
 */
function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&ldquo;": "\"",
    "&rdquo;": "\"",
    "&lsquo;": "'",
    "&rsquo;": "'"
  };
  
  // 数値エンティティ（&#123; や &#x1F;）もデコード
  return text
    .replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    })
    .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity;
    });
}

/**
 * HTMLから本文のテキストを抽出（より正確に）
 */
function extractBodyText(html: string): string {
  // 不要な要素を除去（広告、コメント、ナビゲーションなど）
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    // 広告関連のクラスやIDを持つ要素を除去
    .replace(/<div[^>]*(?:class|id)=["'][^"']*(?:ad|advertisement|ads|banner|sidebar|comment|social|share|related)[^"']*["'][\s\S]*?<\/div>/gi, "")
    .replace(/<section[^>]*(?:class|id)=["'][^"']*(?:ad|advertisement|ads|banner|sidebar|comment|social|share|related)[^"']*["'][\s\S]*?<\/section>/gi, "");

  // 本文コンテンツの特定（優先順位順）
  let content = "";
  
  // 1. articleタグ内のコンテンツ（最も信頼性が高い）
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) {
    content = articleMatch[0];
  } else {
    // 2. mainタグ内のコンテンツ
    const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i);
    if (mainMatch) {
      content = mainMatch[0];
    } else {
      // 3. 本文を示すクラス名を持つdiv（content, post-body, entry-content, article-bodyなど）
      const contentDivMatch = cleaned.match(/<div[^>]*(?:class|id)=["'][^"']*(?:content|post-body|entry-content|article-body|post-content|main-content|article-text)[^"']*["'][\s\S]*?<\/div>/i);
      if (contentDivMatch) {
        content = contentDivMatch[0];
      } else {
        // 4. sectionタグ内のコンテンツ
        const sectionMatch = cleaned.match(/<section[\s\S]*?<\/section>/i);
        if (sectionMatch) {
          content = sectionMatch[0];
        } else {
          // 5. bodyタグ内のコンテンツ（最後の手段）
          const bodyMatch = cleaned.match(/<body[\s\S]*?<\/body>/i);
          content = bodyMatch ? bodyMatch[0] : cleaned;
        }
      }
    }
  }

  // HTMLタグを除去してテキストのみを抽出
  let text = content
    .replace(/<[^>]+>/g, " ") // HTMLタグを除去
    .replace(/\s+/g, " ") // 連続する空白を1つに
    .trim();

  // HTMLエンティティをデコード
  text = decodeHtmlEntities(text);

  // 日本語の文字数を正確にカウント（ひらがな、カタカナ、漢字、英数字など）
  // 空白や改行を除いた実際の文字数
  const actualText = text.replace(/\s/g, "");
  
  return actualText;
}

/**
 * URLからタイトル、説明、本文の文字数を取得
 */
export async function fetchTitleAndSummary(url: string): Promise<{
  title: string | null;
  summary: string | null;
  bodyLength: number;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
      },
      // タイムアウトを設定（15秒）
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Open Graphのタイトルを優先
    let title: string | null = null;
    const ogTitleMatch = html.match(
      /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
    );
    if (ogTitleMatch) {
      title = decodeHtmlEntities(ogTitleMatch[1].trim());
    }

    // titleタグからタイトルを取得（OGタイトルがない場合）
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        title = decodeHtmlEntities(titleMatch[1].trim().replace(/\s+/g, " "));
        // タイトルが長すぎる場合は切り詰める
        if (title.length > 200) {
          title = title.substring(0, 200) + "...";
        }
      }
    }

    // 説明を取得（Open Graph description を優先）
    let summary: string | null = null;
    const ogDescMatch = html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
    );
    if (ogDescMatch) {
      summary = decodeHtmlEntities(ogDescMatch[1].trim());
    } else {
      const metaDescMatch = html.match(
        /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
      );
      if (metaDescMatch) {
        summary = decodeHtmlEntities(metaDescMatch[1].trim());
      }
    }

    // タイトルが取得できない場合は、URLからドメイン名を抽出
    if (!title || title.length === 0) {
      try {
        const urlObj = new URL(url);
        title = urlObj.hostname.replace(/^www\./, "");
      } catch {
        title = url;
      }
    }

    // 本文の文字数を取得
    const bodyText = extractBodyText(html);
    const bodyLength = bodyText.length;

    return { title, summary, bodyLength };
  } catch (error) {
    console.error("Failed to fetch title from URL:", url, error);
    // エラー時はURLからドメイン名を抽出
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");
      return { title: domain, summary: null, bodyLength: 0 };
    } catch {
      return { title: url, summary: null, bodyLength: 0 };
    }
  }
}
