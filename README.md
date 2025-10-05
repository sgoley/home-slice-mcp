# Mortgage Calculator MCP Server

MCP server that provides mortgage calculation tools with live interest rates from FRED.

![Claude Tools](img/Screenshot%20Claude%20Tools.png)

## Features

- Fetch latest 30-year and 15-year mortgage rates from FRED
- Calculate monthly payments including principal, interest, taxes, insurance, and HOA
- Support for down payment as percentage or dollar amount
- Automatic rate fetching or manual rate input
- Comprehensive cost breakdown

## Installation

### Option 1: Docker
```bash
# Build the image
docker build -t home-slice-mcp .

# Run the container
docker run -i home-slice-mcp

# Or use docker-compose
docker-compose up
```

### Option 2: Via npx
```bash
npx mortgage-calc-mcp
```

### Option 3: Local installation
```bash
npm install
npm start
```

## Tools

### `get_mortgage_rates`
Retrieves the latest mortgage rates from FRED.

**Returns:**
- 30-year mortgage rate
- 15-year mortgage rate
- Last updated date

### `calculate_mortgage`
Calculates monthly payment and total costs.

**Parameters:**
- `purchase_price` (required): Home purchase price
- `down_payment` (required): Down payment as "20%" or 50000
- `interest_rate` (optional): Annual rate %. If omitted, fetches latest from FRED
- `loan_term_years` (optional): Loan term, default 30
- `property_tax_annual` (optional): Annual property tax
- `home_insurance_annual` (optional): Annual insurance premium
- `hoa_monthly` (optional): Monthly HOA fees

**Returns:**
- Monthly breakdown (P&I, taxes, insurance, HOA)
- Total monthly payment
- Total interest paid
- Total cost of ownership

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

### Using Docker
```json
{
  "mcpServers": {
    "home-slice-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "HOMESLICE_API_KEY='my-api-key-1238792837-598273498'",
        "home-slice-mcp"
      ],
      "env": {}
    }
  }
}
```

### Using npx
```json
{
  "mcpServers": {
    "mortgage-calc": {
      "command": "npx",
      "args": ["-y", "mortgage-calc-mcp"]
    }
  }
}
```

### Using local installation
```json
{
  "mcpServers": {
    "mortgage-calc": {
      "command": "node",
      "args": ["/path/to/mortgage-calc-mcp/index.js"]
    }
  }
}
```
