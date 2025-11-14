import React from 'react';
import { Article } from '../types/tldr';

interface ArticlesListProps {
  articles: Article[];
}

export default function ArticlesList({ articles }: ArticlesListProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="articles-list" style={{ marginBottom: '20px' }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '12px',
        color: 'var(--text)',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '8px'
      }}>
        Source Articles
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {articles.map((article, index) => (
          <article key={index} style={{
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-secondary)',
            transition: 'all 0.2s ease'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '500',
              margin: '0 0 8px 0',
              color: 'var(--text)',
              lineHeight: '1.4'
            }}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--link)',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {article.title}
              </a>
            </h4>
            <div style={{
              fontSize: '14px',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span>{article.source}</span>
              <span>•</span>
              <time dateTime={new Date(article.publishedAt).toISOString()}>
                {new Date(article.publishedAt).toLocaleString()}
              </time>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}