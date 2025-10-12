<?php
$output = shell_exec('/usr/local/bin/pm2 logs server --lines 100 2>&1');
echo "<pre>$output</pre>";
?>