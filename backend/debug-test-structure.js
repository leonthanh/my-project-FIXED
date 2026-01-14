/**
 * Debug script to check test data structure
 * Run: node debug-test-structure.js
 */

const fetch = require('node-fetch');

async function checkTestStructure() {
  try {
    // Fetch reading tests
    const res = await fetch('http://localhost:3000/api/cambridge/reading-tests?testType=ket-reading');
    const tests = await res.json();
    
    console.log('\n📋 Reading Tests found:', tests.length);
    
    if (tests.length === 0) {
      console.log('❌ No tests found');
      return;
    }
    
    // Get first test details
    const test = tests[0];
    console.log('\n🔍 First Test:', test.title);
    console.log('   ID:', test.id);
    
    // Fetch test details
    const detailRes = await fetch(`http://localhost:3000/api/cambridge/reading-tests/${test.id}`);
    const testDetail = await detailRes.json();
    
    const parts = typeof testDetail.parts === 'string' ? JSON.parse(testDetail.parts) : testDetail.parts;
    
    console.log('\n📊 Test Structure:');
    console.log('   Total Parts:', parts?.length || 0);
    
    let totalTopLevel = 0;
    let totalNested = 0;
    
    parts?.forEach((part, pIdx) => {
      console.log(`\n   Part ${pIdx + 1}:`);
      part.sections?.forEach((sec, sIdx) => {
        console.log(`      Section ${sIdx + 1} (${sec.questionType}):`);
        let sectionCount = 0;
        
        sec.questions?.forEach((q, qIdx) => {
          if (sec.questionType === 'long-text-mc' && q.questions?.length) {
            console.log(`         Q${qIdx + 1}: long-text-mc with ${q.questions.length} nested questions`);
            sectionCount += q.questions.length;
            totalNested += q.questions.length;
          } else if ((sec.questionType === 'cloze-mc' || sec.questionType === 'cloze-test') && q.blanks?.length) {
            console.log(`         Q${qIdx + 1}: ${sec.questionType} with ${q.blanks.length} blanks`);
            sectionCount += q.blanks.length;
            totalNested += q.blanks.length;
          } else {
            console.log(`         Q${qIdx + 1}: regular question`);
            sectionCount += 1;
            totalTopLevel += 1;
          }
        });
        
        console.log(`         Section total: ${sectionCount} questions`);
      });
    });
    
    console.log('\n📈 Summary:');
    console.log('   Top-level questions:', totalTopLevel);
    console.log('   Nested questions:', totalNested);
    console.log('   Total scorable questions:', totalTopLevel + totalNested);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkTestStructure();
