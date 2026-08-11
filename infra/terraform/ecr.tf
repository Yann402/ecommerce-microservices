resource "aws_ecr_repository" "catalogue" {
  name                 = "ecommerce/catalogue"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project = "PFA-ecommerce"
    Env     = "staging"
  }
}