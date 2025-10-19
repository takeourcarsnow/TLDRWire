// Performance test script for summary generation timing
// Run with: node test-performance.js

async function testSummaryPerformance() {
  console.log('Testing summary generation performance...\n');

  const testCases = [
    { region: 'us', category: 'top', style: 'neutral', timeframeHours: 24, limit: 10, language: 'en', uiLocale: 'en-US', length: 'medium' },
    { region: 'us', category: 'technology', style: 'neutral', timeframeHours: 12, limit: 8, language: 'en', uiLocale: 'en-US', length: 'short' },
    { region: 'uk', category: 'business', style: 'formal', timeframeHours: 48, limit: 12, language: 'en', uiLocale: 'en-GB', length: 'long' }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}: ${testCase.region}/${testCase.category} (${testCase.timeframeHours}h, ${testCase.limit} articles, ${testCase.length})`);

    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:3000/api/tldr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase)
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success: ${duration}ms`);
        console.log(`   Used ${data.meta.usedArticles} articles, model: ${data.meta.model}`);
        if (data.meta.fallback) {
          console.log('   ⚠️  Used fallback (no LLM)');
        }
      } else {
        const error = await response.text();
        console.log(`❌ Failed (${response.status}): ${duration}ms`);
        console.log(`   Error: ${error}`);
      }
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`❌ Error: ${duration}ms`);
      console.log(`   ${error.message}`);
    }

    console.log('');

    // Wait a bit between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('Performance test completed. Check server logs for detailed timing breakdown.');
}

// Run the test
testSummaryPerformance().catch(console.error);