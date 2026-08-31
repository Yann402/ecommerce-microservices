# vpc.tf
# Reseau de base pour EKS. Choix staging : noeuds en sous-reseaux PUBLICS
# (acces internet via l'Internet Gateway, gratuit) pour eviter le NAT Gateway
# (~10 $/mois factures en continu). En production : sous-reseaux prives + NAT.

# Le VPC : l'espace reseau isole qui contient tout.
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true   # requis pour qu'EKS resolve les noms internes

  tags = {
    Name    = "ecommerce-vpc"
    Project = "PFA-ecommerce"
    Env     = "staging"
  }
}

# Internet Gateway : la porte de sortie vers internet (GRATUIT).
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name    = "ecommerce-igw"
    Project = "PFA-ecommerce"
  }
}

# Deux sous-reseaux publics, dans deux zones de disponibilite differentes.
# EKS exige au moins deux AZ. eu-west-3 a les AZ a, b, c.
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "eu-west-3a"
  map_public_ip_on_launch = true   # les noeuds recoivent une IP publique

  tags = {
    Name    = "ecommerce-public-a"
    Project = "PFA-ecommerce"
    # Tags requis par EKS pour decouvrir les sous-reseaux :
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "eu-west-3b"
  map_public_ip_on_launch = true

  tags = {
    Name    = "ecommerce-public-b"
    Project = "PFA-ecommerce"
    "kubernetes.io/role/elb" = "1"
  }
}

# Table de routage : dit "tout le trafic sortant passe par l'Internet Gateway".
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name    = "ecommerce-public-rt"
    Project = "PFA-ecommerce"
  }
}

# On associe la table de routage aux deux sous-reseaux.
resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}