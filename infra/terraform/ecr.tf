# ecr.tf - 4 depots d'images Docker (un par service).
locals {
  services = ["catalogue", "iam", "panier", "commandes"]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.services)
  name                 = "ecommerce/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  # Permet a terraform destroy de supprimer le depot meme s'il contient des images.
  force_delete = true

  tags = {
    Project = "PFA-ecommerce"
    Env     = "staging"
  }
}