const { Op } = require('sequelize');
const {
  CambridgeSubmission,
  PlacementAttemptItem,
  PlacementAttempt,
} = require('../models');

/**
 * Backfill script to update Cambridge submissions with "Unknown" student names
 * by looking up the actual student name from placement attempt data.
 * 
 * Usage: node scripts/backfill-cambridge-student-names.js
 */
const backfillCambridgeStudentNames = async () => {
  try {
    console.log('Starting backfill of Cambridge submission student names...');
    
    // Get all Cambridge submissions with "Unknown" student name
    const unknownSubmissions = await CambridgeSubmission.findAll({
      where: {
        studentName: 'Unknown',
      },
    });
    
    console.log(`Found ${unknownSubmissions.length} submissions with "Unknown" name`);
    
    if (unknownSubmissions.length === 0) {
      console.log('No submissions to update.');
      return;
    }
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const submission of unknownSubmissions) {
      // Find the placement attempt item that references this submission
      const attemptItem = await PlacementAttemptItem.findOne({
        where: {
          runtimeSubmissionModel: 'cambridge',
          runtimeSubmissionId: submission.id,
        },
      });
      
      if (attemptItem) {
        // Get the placement attempt separately
        const attempt = await PlacementAttempt.findByPk(attemptItem.attemptId);
        
        if (attempt && attempt.studentName) {
          const newName = attempt.studentName;
          const newPhone = attempt.studentPhone;
          
          await submission.update({
            studentName: newName,
            studentPhone: newPhone || submission.studentPhone,
          });
          
          console.log(
            `✅ Updated submission #${submission.id}: "${newName}" (was "Unknown")`
          );
          updatedCount++;
        } else {
          console.log(
            `⏭️  Skipped submission #${submission.id}: No placement attempt data found`
          );
          skippedCount++;
        }
      } else {
        console.log(
          `⏭️  Skipped submission #${submission.id}: Not linked to placement attempt`
        );
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${unknownSubmissions.length}`);
    
    if (updatedCount > 0) {
      console.log(`\n✨ Backfill complete! ${updatedCount} submissions updated.`);
    }
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  const sequelize = require('../db');
  
  sequelize.authenticate()
    .then(() => {
      console.log('✅ Database connected');
      return backfillCambridgeStudentNames();
    })
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { backfillCambridgeStudentNames };
