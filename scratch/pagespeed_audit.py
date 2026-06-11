import urllib.request
import json
import sys

def run_psi(url, strategy):
    print(f"Running PageSpeed Insights for {url} on {strategy.upper()}...", flush=True)
    api_url = f"https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url={urllib.parse.quote(url)}&strategy={strategy}&category=performance&category=accessibility&category=best-practices&category=seo"
    try:
        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            # Extract scores
            lighthouse_result = data.get('lighthouseResult', {})
            categories = lighthouse_result.get('categories', {})
            
            perf = categories.get('performance', {}).get('score', 0) * 100
            acc = categories.get('accessibility', {}).get('score', 0) * 100
            bp = categories.get('best-practices', {}).get('score', 0) * 100
            seo = categories.get('seo', {}).get('score', 0) * 100
            
            # Extract core metrics
            metrics = lighthouse_result.get('audits', {})
            fcp = metrics.get('first-contentful-paint', {}).get('displayValue', 'N/A')
            lcp = metrics.get('largest-contentful-paint', {}).get('displayValue', 'N/A')
            cls = metrics.get('cumulative-layout-shift', {}).get('displayValue', 'N/A')
            tbt = metrics.get('total-blocking-time', {}).get('displayValue', 'N/A')
            speed_index = metrics.get('speed-index', {}).get('displayValue', 'N/A')
            
            print(f"\n=== {strategy.upper()} RESULTS ===")
            print(f"Performance: {perf:.0f}/100")
            print(f"Accessibility: {acc:.0f}/100")
            print(f"Best Practices: {bp:.0f}/100")
            print(f"SEO: {seo:.0f}/100")
            print(f"\nCore Metrics:")
            print(f" - First Contentful Paint (FCP): {fcp}")
            print(f" - Largest Contentful Paint (LCP): {lcp}")
            print(f" - Cumulative Layout Shift (CLS): {cls}")
            print(f" - Total Blocking Time (TBT): {tbt}")
            print(f" - Speed Index: {speed_index}")
            
            # Extract top opportunities
            print("\nTop Opportunities for Improvement:")
            opportunities = []
            for audit_name, audit_data in metrics.items():
                if audit_data.get('details', {}).get('type') == 'opportunity':
                    overall_savings = audit_data.get('details', {}).get('overallSavingsMs', 0)
                    if overall_savings > 0:
                        opportunities.append((audit_data.get('title'), overall_savings, audit_data.get('description')))
            
            # Sort by potential savings
            opportunities.sort(key=lambda x: x[1], reverse=True)
            for title, savings, desc in opportunities[:5]:
                print(f" * {title} (Potential Savings: {savings}ms)")
                # Strip simple markdown links if any
                clean_desc = desc.replace('[', '').replace(']', '')
                print(f"   {clean_desc[:120]}...")
                
    except Exception as e:
        print(f"Error running audit for {strategy}: {e}", file=sys.stderr)

if __name__ == "__main__":
    target_url = "https://flowstable.vercel.app"
    run_psi(target_url, "mobile")
    print("\n" + "="*40 + "\n")
    run_psi(target_url, "desktop")
