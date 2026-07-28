# stop-k8s.ps1
Write-Host "Cleaning up StudyHub Kubernetes resources..." -ForegroundColor Red

# Delete all resources defined in the K8s folder
kubectl delete -f K8s/

Write-Host "`nCleanup complete!" -ForegroundColor Green