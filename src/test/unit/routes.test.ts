import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Public Routing and SEO Metadata', () => {
  it('robots.txt should not point to legacy /catalog route', () => {
    const robotsPath = path.resolve(__dirname, '../../../public/robots.txt');
    if (fs.existsSync(robotsPath)) {
      const content = fs.readFileSync(robotsPath, 'utf-8');
      expect(content).not.toContain('Allow: /catalog');
      expect(content).toContain('Allow: /products');
    }
  });

  it('App.tsx should contain redirect from /catalog to /products', () => {
    const appPath = path.resolve(__dirname, '../../App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content).toContain('<Route path="/catalog" element={<Navigate to="/products" replace />} />');
  });

  it('App.tsx should not import legacy pages', () => {
    const appPath = path.resolve(__dirname, '../../App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content).not.toContain('legacy-pages');
    // Ensure that none of the legacy pages like Cart, Checkout are imported
    expect(content).not.toContain('Cart');
    expect(content).not.toContain('Checkout');
    expect(content).not.toContain('Orders');
    expect(content).not.toContain('Marketplace');
  });
});
