# outputs.tf
output "cluster_name" {
  value = aws_eks_cluster.main.name
}
output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}
output "ecr_urls" {
  value = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}