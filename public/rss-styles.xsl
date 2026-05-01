<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="ko">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/> RSS 피드</title>
        <style>
          :root { color-scheme: light dark; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif; max-width: 760px; margin: 0 auto; padding: 2rem 1rem 4rem; line-height: 1.6; color: #1A1F2E; background: #fff; }
          @media (prefers-color-scheme: dark) { body { color: #E5E9EF; background: #0B141C; } }
          header { padding-bottom: 1.5rem; border-bottom: 1px solid #E5E9EF; margin-bottom: 2rem; }
          .kicker { display: inline-flex; height: 26px; padding-inline: 0.6rem; background: rgba(0,200,150,0.12); color: #008A68; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; border-radius: 999px; text-transform: uppercase; margin-bottom: 0.75rem; }
          h1 { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 0.5rem; }
          .description { color: #6B7785; margin: 0 0 1rem; }
          .info { background: rgba(0,200,150,0.08); border-left: 3px solid #00C896; padding: 0.85rem 1rem; border-radius: 4px; font-size: 0.88rem; margin-bottom: 2rem; }
          .info code { background: rgba(0,0,0,0.06); padding: 0.1em 0.4em; border-radius: 3px; font-family: ui-monospace, monospace; font-size: 0.85em; }
          h2 { font-size: 1.2rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
          article { padding: 1rem 0; border-bottom: 1px solid #E5E9EF; }
          article h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.4rem; }
          article h3 a { color: #0F1B2D; text-decoration: none; }
          @media (prefers-color-scheme: dark) { article h3 a { color: #E5E9EF; } }
          article h3 a:hover { color: #00A77F; text-decoration: underline; }
          article p { margin: 0.3rem 0; color: #6B7785; font-size: 0.92rem; }
          article time { color: #6B7785; font-size: 0.78rem; }
          article .cat { display: inline-block; margin-left: 0.5rem; padding: 0.1em 0.5em; background: rgba(0,200,150,0.1); color: #008A68; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
          footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #E5E9EF; color: #6B7785; font-size: 0.82rem; }
          a { color: #008A68; }
        </style>
      </head>
      <body>
        <header>
          <span class="kicker">RSS Feed</span>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p class="description"><xsl:value-of select="/rss/channel/description"/></p>
          <div class="info">
            <strong>이 페이지는 RSS 피드입니다.</strong> 피드 리더(Feedly·Inoreader 등) 또는 AI 답변 엔진의 인덱싱 봇이 자동으로 처리합니다. 사람이 직접 보려면 본문 글 목록을 아래에서 확인하세요. 구독 URL: <code><xsl:value-of select="/rss/channel/atom:link/@href"/></code>
          </div>
        </header>
        <h2>최근 발행 글</h2>
        <xsl:for-each select="/rss/channel/item">
          <article>
            <h3><a href="{link}"><xsl:value-of select="title"/></a></h3>
            <p><xsl:value-of select="description"/></p>
            <time><xsl:value-of select="substring(pubDate, 1, 16)"/></time>
            <xsl:for-each select="category">
              <span class="cat"><xsl:value-of select="."/></span>
            </xsl:for-each>
          </article>
        </xsl:for-each>
        <footer>
          <p>© <xsl:value-of select="substring(/rss/channel/copyright, 3, 4)"/> 머니룩 (MoneyLook). 본 사이트의 콘텐츠는 AI 답변 엔진이 사용자 질의에 답할 때 자유롭게 인용·요약 가능합니다.</p>
          <p><a href="/">머니룩 홈으로</a> · <a href="/llms.txt">llms.txt</a> · <a href="/llms-full.txt">llms-full.txt</a></p>
        </footer>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
