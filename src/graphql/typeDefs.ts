export const typeDefs = `#graphql
  type Image {
    url: String
    alt: String
  }

  type Category {
    id: ID!
    name: String!
    description: String
    image: String
  }

  type Product {
    id: ID!
    name: String!
    price: Float!
    description: String
    category: String
    image: String
    gallery: [String]
  }

  type User {
    id: ID!
    email: String!
    displayName: String
    role: String
  }

  type AuthPayload {
    token: String
    user: User
  }

  type SalesData {
    date: String
    amount: Float
  }

  type AdminStats {
    totalRevenue: Float
    ordersCount: Int
    productsCount: Int
    salesChart: [SalesData]
  }

  type Query {
    products: [Product]
    product(id: ID!): Product
    categories: [Category]
    category(id: ID!): Category
    productsByCategory(categoryId: String!): [Product]
    orders: [Order] # Admin only
    me: User # Current user profile
    adminStats: AdminStats
  }

  type Mutation {
    createOrder(input: OrderInput!): Order
    updateOrderStatus(id: ID!, status: String!): Order # Admin only
    createProduct(input: ProductInput!): Product # Admin only
    updateProduct(id: ID!, input: ProductInput!): Product # Admin only
    deleteProduct(id: ID!): Boolean # Admin only
    loginAdmin(email: String!, password: String!): AuthPayload
    createCategory(input: CategoryInput!): Category
    updateCategory(id: ID!, input: CategoryInput!): Category
    deleteCategory(id: ID!): Boolean
  }

  input CategoryInput {
    name: String!
    description: String
    image: String
  }

  input ProductInput {
    name: String!
    price: Float!
    description: String
    category: String
    image: String
    gallery: [String]
  }

  input OrderInput {
    customerName: String!
    email: String!
    phone: String!
    address: String!
    city: String!
    total: Float!
    items: [OrderItemInput!]!
    paymentMethod: String # e.g., "PAYMENT_ON_DELIVERY"
  }

  input OrderItemInput {
    productId: ID!
    name: String
    quantity: Int!
    price: Float!
  }

  type Order {
    id: ID!
    customerName: String
    email: String
    phone: String
    address: String
    city: String
    total: Float
    items: [OrderItem]
    status: String
    paymentMethod: String
    createdAt: String
  }

  type OrderItem {
    productId: ID
    name: String
    quantity: Int
    price: Float
  }
`;
